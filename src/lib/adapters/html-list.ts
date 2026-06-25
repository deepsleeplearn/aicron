import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";

import { canonicalizeUrl, cleanText } from "../normalization";
import type { RawItem } from "../types";

type ExtractHtmlListItemsInput = {
  sourceId: string;
  sourceName: string;
  baseUrl: string;
  html: string;
  includePathPrefixes?: string[];
  includeHostnames?: string[];
};

export function extractHtmlListItems(input: ExtractHtmlListItemsInput): RawItem[] {
  const $ = cheerio.load(input.html);
  const seen = new Set<string>();
  const items: RawItem[] = [];
  const base = new URL(input.baseUrl);
  const allowedHosts = new Set([base.hostname, ...(input.includeHostnames ?? [])]);

  $("a[href]").each((_, node) => {
    const href = $(node).attr("href");
    const title = extractLinkTitle($, node);
    if (!href || !title || title.length < 4) return;

    const url = new URL(href, input.baseUrl);
    if (!allowedHosts.has(url.hostname)) return;
    if (url.hostname === base.hostname && !matchesPath(url.pathname, input.includePathPrefixes)) return;

    const canonicalUrl = canonicalizeUrl(url.toString());
    if (canonicalUrl === canonicalizeUrl(input.baseUrl)) return;
    if (seen.has(canonicalUrl)) return;
    seen.add(canonicalUrl);
    items.push({
      sourceId: input.sourceId,
      sourceName: input.sourceName,
      title,
      canonicalUrl,
      publishedAt: extractPublishedAt($, node),
      excerpt: extractLinkExcerpt($, node) ?? title,
      categories: []
    });
  });

  const scriptItems = input.includeHostnames?.length
    ? extractScriptUrlFallback($, input, allowedHosts, seen)
    : [];
  if (items.length > 0 || scriptItems.length > 0) return [...items, ...scriptItems];
  return extractHeadingFallback($, input);
}

function extractLinkTitle($: cheerio.CheerioAPI, node: AnyNode): string {
  const heading = $(node).find("h1, h2, h3, h4, h5").first();
  const titledElement = $(node).find("[class*='title'], [class*='Title']").first();
  return cleanText(heading.text() || titledElement.text() || $(node).text());
}

function extractLinkExcerpt($: cheerio.CheerioAPI, node: AnyNode): string | null {
  const paragraph = cleanText($(node).find("p").first().text());
  if (paragraph) return paragraph;
  const article = cleanText($(node).find("article").first().text());
  if (article) return article;

  const container = closestItemContainer($, node);
  const excerpt = cleanText(
    container.find(".excerpt-text, [class*='excerpt'], [class*='Excerpt'], [class*='summary'], [class*='Summary']").first().text()
  );
  if (excerpt) return excerpt;
  const siblingParagraph = cleanText(container.find("p").first().text());
  return siblingParagraph || null;
}

function extractPublishedAt($: cheerio.CheerioAPI, node: AnyNode): string | null {
  const time = $(node).find("time").first();
  const datetime = time.attr("datetime");
  const timeText = cleanText(time.text());
  if (datetime || timeText) return datetime || timeText;

  const htmlDate = ($(node).html() ?? "").match(/\b\d{4}-\d{2}-\d{2}\b/)?.[0];
  if (htmlDate) return htmlDate;

  const containerHtml = closestItemContainer($, node).html() ?? "";
  const commentDate = containerHtml.match(/<!--\s*([A-Z][a-z]+ \d{1,2}, \d{4})\s*-->/)?.[1];
  if (commentDate) return commentDate;

  const linkText = cleanText($(node).text());
  return linkText.match(/\b\d{4}-\d{2}-\d{2}\b/)?.[0] ?? null;
}

function closestItemContainer($: cheerio.CheerioAPI, node: AnyNode): cheerio.Cheerio<AnyNode> {
  const preferredContainer = $(node).closest("article, .info");
  return preferredContainer.length > 0
    ? preferredContainer
    : $(node).closest("[class*='card'], [class*='Card'], [class*='post'], [class*='Post']");
}

function matchesPath(pathname: string, prefixes?: string[]): boolean {
  if (!prefixes || prefixes.length === 0) return true;
  return prefixes.some((prefix) => pathname.startsWith(prefix));
}

function extractHeadingFallback(
  $: cheerio.CheerioAPI,
  input: ExtractHtmlListItemsInput
): RawItem[] {
  const items: RawItem[] = [];
  $("h2, h3").each((index, node) => {
    const title = cleanText($(node).text());
    if (!title || title.length < 4 || items.some((item) => item.title === title)) return;
    const anchor = title
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, "")
      .replace(/\s+/g, "-");
    items.push({
      sourceId: input.sourceId,
      sourceName: input.sourceName,
      title,
      canonicalUrl: `${canonicalizeUrl(input.baseUrl)}#${anchor || `section-${index}`}`,
      excerpt: title,
      categories: []
    });
  });
  return items.slice(0, 20);
}

export async function fetchHtmlListItems(input: {
  sourceId: string;
  sourceName: string;
  url: string;
  includePathPrefixes?: string[];
  includeHostnames?: string[];
}): Promise<RawItem[]> {
  const response = await fetch(input.url, {
    headers: { "user-agent": "ai-morning-brief/0.1" },
    next: { revalidate: 0 }
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} while fetching ${input.url}`);
  }
  const html = await response.text();
  return extractHtmlListItems({
    sourceId: input.sourceId,
    sourceName: input.sourceName,
    baseUrl: input.url,
    html,
    includePathPrefixes: input.includePathPrefixes,
    includeHostnames: input.includeHostnames
  });
}

function extractScriptUrlFallback(
  $: cheerio.CheerioAPI,
  input: ExtractHtmlListItemsInput,
  allowedHosts: Set<string>,
  seen: Set<string>
): RawItem[] {
  const html = $.html();
  const items: RawItem[] = [];
  const urlPattern = /https?:\\?\/\\?\/[^"'\\<>\s]+/g;

  for (const match of html.matchAll(urlPattern)) {
    const rawUrl = match[0]
      .replaceAll("\\/", "/")
      .replace(/\\+$/, "");
    let url: URL;
    try {
      url = new URL(rawUrl);
    } catch {
      continue;
    }
    if (!allowedHosts.has(url.hostname)) continue;

    const canonicalUrl = canonicalizeUrl(url.toString());
    if (seen.has(canonicalUrl)) continue;
    seen.add(canonicalUrl);

    const context = cleanScriptContext(html.slice(Math.max(0, match.index - 700), match.index + 700));
    const title = inferTitleFromUrl(url, context);
    if (!title || title.length < 4) continue;

    items.push({
      sourceId: input.sourceId,
      sourceName: input.sourceName,
      title,
      canonicalUrl,
      excerpt: context || title,
      categories: []
    });
  }

  return items.slice(0, 30);
}

function cleanScriptContext(text: string): string {
  const textFields = Array.from(text.matchAll(/"text":"([^"]+)"/g))
    .map((match) => decodeEscapedText(match[1]))
    .filter((value) => value.length >= 6 && !/^https?:\/\//.test(value));
  if (textFields.length > 0) {
    return cleanText(Array.from(new Set(textFields)).join(" ")).slice(0, 260);
  }

  return cleanText(
    text
      .replace(/\\u([\dA-Fa-f]{4})/g, (_, code) => String.fromCharCode(Number.parseInt(code, 16)))
      .replace(/\\n/g, " ")
      .replace(/\\"/g, '"')
      .replace(/\\\//g, "/")
      .replace(/&quot;|&#x27;|&amp;/g, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/[_a-zA-Z0-9-]{18,}/g, " ")
  ).slice(0, 260);
}

function decodeEscapedText(text: string): string {
  return cleanText(
    text
      .replace(/\\u([\dA-Fa-f]{4})/g, (_, code) => String.fromCharCode(Number.parseInt(code, 16)))
      .replace(/\\n/g, " ")
      .replace(/\\"/g, '"')
      .replace(/\\\//g, "/")
  );
}

function inferTitleFromUrl(url: URL, context: string): string {
  const repoMatch = url.pathname.match(/\/([^/]+\/[^/?#]+)/);
  if (url.hostname === "github.com" && repoMatch) {
    return repoMatch[1];
  }

  if (url.hostname.includes("autoglm") && url.pathname.includes("autoclaw")) {
    return "AutoClaw";
  }
  if (url.hostname.includes("autoglm")) {
    return "AutoGLM OpenClaw";
  }
  if (url.hostname === "cogagent.aminer.cn") {
    return "CogAgent Technical Report";
  }
  if (url.hostname === "agent.aminer.cn") {
    return "AMiner Agent";
  }

  const known = [
    "AutoClaw",
    "AutoGLM",
    "CogAgent",
    "GLM-5",
    "GLM-Image",
    "GLM-V",
    "DeepSeek-R1",
    "DeepSeek-V3",
    "DeepSeek-Coder",
    "MiniMax Code"
  ];
  const matched = known.find((name) => context.toLowerCase().includes(name.toLowerCase()));
  if (matched) return matched;

  const slug = decodeURIComponent(url.pathname.split("/").filter(Boolean).at(-1) ?? url.hostname);
  return slug.replace(/[-_]+/g, " ");
}
