import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";

import { encodeRichHtmlContent } from "../rich-content";
import type { RawItem } from "../types";

const execFileAsync = promisify(execFile);
const TWITTER_CLI_TIMEOUT_MS = 60_000;
const TWITTER_CLI_MAX_BUFFER = 16 * 1024 * 1024;
const DEFAULT_TWITTER_CHROME_PROFILE = "Profile 1";
const PINNED_TWEET_ID_SCRIPT = `
import sys
from twitter_cli.cli import _get_client
from twitter_cli.config import load_config
from twitter_cli.graphql import FEATURES

screen_name = sys.argv[1].lstrip("@")
client = _get_client(load_config(), quiet=True)
data = client._graphql_get(
    "UserByScreenName",
    {"screen_name": screen_name, "withSafetyModeUserFields": True},
    FEATURES,
)
legacy = data.get("data", {}).get("user", {}).get("result", {}).get("legacy", {})
pinned_ids = legacy.get("pinned_tweet_ids_str") or []
print(pinned_ids[0] if pinned_ids else "")
`;

export type TwitterCliPost = {
  id?: string;
  text?: string;
  author?: {
    name?: string;
    screenName?: string;
  };
  metrics?: Record<string, number | string | null | undefined>;
  createdAtISO?: string;
  createdAt?: string;
  urls?: string[];
  media?: TwitterCliMedia[];
  isRetweet?: boolean;
  retweetedBy?: string | null;
  articleTitle?: string;
  quotedTweet?: {
    id?: string;
    text?: string;
    author?: {
      name?: string;
      screenName?: string;
    };
  };
  isPinned?: boolean;
};

type TwitterCliMedia = {
  type?: string;
  url?: string;
  width?: number;
  height?: number;
};

type TwitterCliPayload = {
  ok?: boolean;
  data?: TwitterCliPost[];
};

export function extractTwitterUserPostItems(input: {
  sourceId: string;
  sourceName: string;
  screenName: string;
  json: string;
}): RawItem[] {
  const posts = parseTwitterCliPosts(input.json);
  return twitterPostsToRawItems({
    ...input,
    posts
  });
}

export function mergePinnedTwitterPosts(input: {
  posts: TwitterCliPost[];
  pinnedPost: TwitterCliPost | null;
  pinnedTweetId: string | null;
}): TwitterCliPost[] {
  if (!input.pinnedTweetId) return input.posts;

  const pinnedPost = input.pinnedPost ?? input.posts.find((post) => post.id === input.pinnedTweetId) ?? null;
  if (!pinnedPost) return input.posts;

  const dedupedPosts = input.posts.filter((post) => post.id !== input.pinnedTweetId);
  return [{ ...pinnedPost, isPinned: true }, ...dedupedPosts];
}

function twitterPostsToRawItems(input: {
  sourceId: string;
  sourceName: string;
  screenName: string;
  posts: TwitterCliPost[];
}): RawItem[] {
  const screenName = normalizeScreenName(input.screenName);
  const expertName = expertNameFromSourceName(input.sourceName);
  return input.posts
    .filter((post) => post.id && (post.text || post.articleTitle))
    .map((post, index) => {
      const title = postTitle(post);
      const excerpt = postExcerpt(post);
      const content = postContent(post);
      const isRetweet = Boolean(post.isRetweet);
      return {
        sourceId: input.sourceId,
        sourceName: input.sourceName,
        title,
        canonicalUrl: `https://x.com/${screenName}/status/${post.id}`,
        publishedAt: post.createdAtISO ?? post.createdAt ?? null,
        excerpt,
        content,
        categories: ["X", ...(post.isPinned ? ["Pinned"] : []), isRetweet ? "Repost" : "Original", expertName],
        sourceOrder: index
      };
    });
}

export async function fetchTwitterUserPostItems(input: {
  sourceId: string;
  sourceName: string;
  url: string;
  maxItems?: number;
}): Promise<RawItem[]> {
  const screenName = screenNameFromUrl(input.url);
  const maxItems = input.maxItems ?? 50;
  const [timelineJson, pinnedTweetId] = await Promise.all([
    fetchTwitterJson(["user-posts", `@${screenName}`, "-n", String(maxItems), "--json"]),
    fetchPinnedTweetId(screenName).catch(() => null)
  ]);
  const posts = parseTwitterCliPosts(timelineJson);
  const existingPinnedPost = pinnedTweetId ? posts.find((post) => post.id === pinnedTweetId) ?? null : null;
  const fetchedPinnedPost = pinnedTweetId && !existingPinnedPost
    ? await fetchPinnedTweetPost(pinnedTweetId).catch(() => null)
    : null;
  const mergedPosts = mergePinnedTwitterPosts({
    posts,
    pinnedPost: existingPinnedPost ?? fetchedPinnedPost,
    pinnedTweetId
  }).slice(0, maxItems);

  return twitterPostsToRawItems({
    sourceId: input.sourceId,
    sourceName: input.sourceName,
    screenName,
    posts: mergedPosts
  });
}

function parseTwitterCliPosts(json: string): TwitterCliPost[] {
  const payload = JSON.parse(json) as TwitterCliPayload;
  if (payload.ok === false) throw new Error("twitter-cli returned ok=false");
  return Array.isArray(payload.data) ? payload.data : [];
}

async function fetchPinnedTweetPost(tweetId: string): Promise<TwitterCliPost | null> {
  const json = await fetchTwitterJson(["tweet", tweetId, "--json"]);
  return parseTwitterCliPosts(json).find((post) => post.id === tweetId) ?? null;
}

async function fetchTwitterJson(args: string[]): Promise<string> {
  const { stdout } = await execFileAsync("twitter", args, {
    env: twitterCliEnv(),
    timeout: TWITTER_CLI_TIMEOUT_MS,
    maxBuffer: TWITTER_CLI_MAX_BUFFER
  });
  return stdout;
}

function twitterCliEnv() {
  return {
    ...process.env,
    TWITTER_BROWSER: process.env.TWITTER_BROWSER ?? "chrome",
    TWITTER_CHROME_PROFILE: process.env.TWITTER_CHROME_PROFILE ?? DEFAULT_TWITTER_CHROME_PROFILE
  };
}

async function fetchPinnedTweetId(screenName: string): Promise<string | null> {
  const command = await resolveTwitterPythonCommand();
  if (!command) return null;
  const { stdout } = await execFileAsync(command.command, [...command.args, "-c", PINNED_TWEET_ID_SCRIPT, screenName], {
    env: twitterCliEnv(),
    timeout: TWITTER_CLI_TIMEOUT_MS,
    maxBuffer: TWITTER_CLI_MAX_BUFFER
  });
  const tweetId = stdout.trim().split(/\s+/)[0];
  return tweetId && /^\d+$/.test(tweetId) ? tweetId : null;
}

async function resolveTwitterPythonCommand(): Promise<{ command: string; args: string[] } | null> {
  const { stdout } = await execFileAsync("which", ["twitter"], {
    timeout: 5_000,
    maxBuffer: 1024 * 1024
  });
  const twitterPath = stdout.trim().split(/\r?\n/)[0];
  if (!twitterPath) return null;

  const wrapper = await readFile(twitterPath, "utf8");
  const firstLine = wrapper.split(/\r?\n/, 1)[0] ?? "";
  if (!firstLine.startsWith("#!")) return null;

  const shebang = firstLine.slice(2).trim();
  if (!shebang) return null;
  if (shebang.startsWith("/usr/bin/env ")) {
    const parts = shebang.split(/\s+/);
    return { command: parts[0], args: parts.slice(1) };
  }
  return { command: shebang, args: [] };
}

function screenNameFromUrl(url: string): string {
  const parsed = new URL(url);
  const firstPathPart = parsed.pathname.split("/").filter(Boolean)[0];
  if (!firstPathPart) throw new Error(`Cannot derive X screen name from ${url}`);
  return normalizeScreenName(firstPathPart);
}

function normalizeScreenName(screenName: string): string {
  return screenName.replace(/^@/, "");
}

function expertNameFromSourceName(sourceName: string): string {
  return cleanText(sourceName.replace(/\s+X Posts$/i, ""));
}

function postTitle(post: TwitterCliPost): string {
  const base = cleanText(post.articleTitle || firstMeaningfulLine(post.text) || `X post ${post.id}`);
  return truncate(base, 180);
}

function postExcerpt(post: TwitterCliPost): string {
  const text = cleanText(post.articleTitle || post.text || "");
  const author = post.author?.screenName ? `@${post.author.screenName}` : post.author?.name;
  const repostPrefix = post.isRetweet && author ? `Repost from ${author}: ` : "";
  return truncate(`${repostPrefix}${text}`, 260);
}

function postContent(post: TwitterCliPost): string {
  const lines = [
    post.isRetweet && post.author?.screenName ? `Repost from @${post.author.screenName}` : null,
    post.text ? cleanText(post.text) : null,
    post.articleTitle ? `Article: ${post.articleTitle}` : null,
    post.quotedTweet
      ? `Quoted @${post.quotedTweet.author?.screenName ?? "unknown"}: ${cleanText(post.quotedTweet.text ?? "")}`
      : null,
    metricsLine(post.metrics)
  ].filter(isPresent);

  const paragraphs = lines.map((line) => paragraphHtml(line));
  const links = (post.urls ?? []).map((url) => linkParagraphHtml(url));
  const media = mediaHtml(post);
  return encodeRichHtmlContent(`<article>${[...paragraphs, ...links, ...media].join("")}</article>`);
}

function firstMeaningfulLine(text?: string): string {
  return (text ?? "")
    .split(/\n+/)
    .map(cleanText)
    .find(Boolean) ?? "";
}

function metricsLine(metrics?: Record<string, number | string | null | undefined>): string | null {
  if (!metrics) return null;
  const labels: Array<[string, string]> = [
    ["likes", "Likes"],
    ["retweets", "Retweets"],
    ["replies", "Replies"],
    ["quotes", "Quotes"],
    ["views", "Views"],
    ["bookmarks", "Bookmarks"]
  ];
  const parts = labels
    .map(([key, label]) => {
      const value = metrics[key];
      return value === null || value === undefined || value === "" ? null : `${label}: ${value}`;
    })
    .filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

function cleanText(text: string): string {
  return decodeBasicEntities(text).replace(/\s+/g, " ").trim();
}

function isPresent(value: string | null | undefined): value is string {
  return Boolean(value);
}

function truncate(text: string, maxLength: number): string {
  const cleaned = cleanText(text);
  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, maxLength - 1).trim()}…`;
}

function paragraphHtml(text: string): string {
  return `<p>${linkifyText(text)}</p>`;
}

function linkParagraphHtml(url: string): string {
  return `<p>Link: ${anchorHtml(url)}</p>`;
}

function linkifyText(text: string): string {
  const pattern = /https?:\/\/[^\s<>"']+/g;
  let html = "";
  let lastIndex = 0;

  for (const match of text.matchAll(pattern)) {
    const matchIndex = match.index ?? 0;
    const rawMatch = match[0];
    const { url, trailing } = splitTrailingUrlPunctuation(rawMatch);
    html += escapeHtml(text.slice(lastIndex, matchIndex));
    html += anchorHtml(url);
    html += escapeHtml(trailing);
    lastIndex = matchIndex + rawMatch.length;
  }

  html += escapeHtml(text.slice(lastIndex));
  return html;
}

function splitTrailingUrlPunctuation(value: string): { url: string; trailing: string } {
  let url = value;
  let trailing = "";
  while (/[.,;:!?)]$/.test(url)) {
    trailing = `${url.at(-1)}${trailing}`;
    url = url.slice(0, -1);
  }
  return { url, trailing };
}

function anchorHtml(url: string): string {
  const cleaned = cleanText(url);
  if (!isHttpUrl(cleaned)) return escapeHtml(cleaned);
  const escapedUrl = escapeAttribute(cleaned);
  return `<a href="${escapedUrl}" target="_blank" rel="noreferrer" draggable="false">${escapeHtml(cleaned)}</a>`;
}

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function mediaHtml(post: TwitterCliPost): string[] {
  return (post.media ?? [])
    .filter((media): media is TwitterCliMedia & { url: string } => Boolean(media.url))
    .map((media) => {
      const type = cleanText(media.type ?? "media").toLowerCase();
      const dimensions = media.width && media.height ? `${media.width}x${media.height}` : null;
      const caption = [type, dimensions].filter(Boolean).join(" · ");
      const escapedUrl = escapeAttribute(media.url);
      const escapedCaption = caption ? escapeHtml(caption) : "";
      const body = type === "video"
        ? `<video controls src="${escapedUrl}" draggable="false"></video>`
        : `<img src="${escapedUrl}" alt="${escapeAttribute(mediaAlt(post, type))}" loading="lazy" draggable="false" />`;
      return `<figure>${body}${escapedCaption ? `<figcaption>${escapedCaption}</figcaption>` : ""}</figure>`;
    });
}

function mediaAlt(post: TwitterCliPost, type: string): string {
  const author = post.author?.screenName ? `@${post.author.screenName}` : "X post";
  return `${type} from ${author}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value: string): string {
  return escapeHtml(value);
}

function decodeBasicEntities(value: string): string {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");
}
