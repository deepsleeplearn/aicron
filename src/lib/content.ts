import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";

import { cleanText } from "./normalization";
import { encodeRichHtmlContent, isRichHtmlContent, richContentToText } from "./rich-content";

const runFile = promisify(execFile);
const MAX_HTML_TEXT_LENGTH = 20000;
const MAX_TEXT_LENGTH = 20000;

type ContentSource = {
  url: string;
  type: "html" | "pdf" | "text";
};

const KNOWN_CONTENT_SOURCES: Array<ContentSource & { pattern: RegExp }> = [
  {
    pattern: /(?:^|\.)openai\.com\/(?:index\/)?deployment-simulation\/?$/,
    url: "https://cdn.openai.com/pdf/predicting-llm-safety-before-release-by-simulating-deployment.pdf",
    type: "pdf"
  }
];

const RICH_HTML_UPGRADE_SOURCE_IDS = new Set([
  "openai-research-index",
  "openai-codex-blog",
  "anthropic-research",
  "anthropic-news",
  "claude-blog-posts",
  "kimi-blog",
  "minimax-blog",
  "stanford-ai-lab-blog",
  "bair-blog",
  "cmu-ml-blog",
  "mila-blog"
]);

const COMPLETE_CONTENT_SOURCE_IDS = new Set([
  "karpathy-x-posts",
  "raschka-x-posts",
  "boris-cherny-x-posts",
  "alphaxiv-x-posts",
  "anatoli-kopadze-x-posts",
  "lilian-weng-x-posts",
  "openai-x-posts",
  "chatgpt-x-posts",
  "anthropic-x-posts",
  "claude-x-posts"
]);

export async function fetchArticleContent(url: string): Promise<string | null> {
  if (url.includes("#")) return null;
  const primary = await fetchContentSource({ url, type: "html" }).catch(() => null);
  if (primary) return primary;

  const fallback = knownContentSourceForUrl(url);
  if (!fallback) return null;
  return fetchContentSource(fallback).catch(() => null);
}

export function shouldRefreshArticleContent(input: {
  sourceId?: string | null;
  content?: string | null;
  excerpt?: string | null;
  summary?: string | null;
}): boolean {
  if (input.sourceId === "vector-publications") return false;
  if (input.sourceId && COMPLETE_CONTENT_SOURCE_IDS.has(input.sourceId)) return false;

  const content = normalizeComparableText(richContentToText(input.content));
  if (content.length < 500) return true;
  if (isRichHtmlContent(input.content)) return false;

  const fallbackLength = Math.max(
    normalizeComparableText(input.summary).length,
    normalizeComparableText(input.excerpt).length
  );

  return content.length <= fallbackLength + 300;
}

export function shouldUpgradePlainArticleContent(input: {
  sourceId: string;
  canonicalUrl: string;
  content?: string | null;
}): boolean {
  if (!input.content || isRichHtmlContent(input.content)) return false;
  if (!RICH_HTML_UPGRADE_SOURCE_IDS.has(input.sourceId)) return false;

  let url: URL;
  try {
    url = new URL(input.canonicalUrl);
  } catch {
    return false;
  }
  if (!["http:", "https:"].includes(url.protocol)) return false;
  return !url.pathname.toLowerCase().endsWith(".pdf");
}

export function knownContentSourceForUrl(rawUrl: string): ContentSource | null {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }

  const normalized = `${parsed.hostname}${parsed.pathname}`;
  const match = KNOWN_CONTENT_SOURCES.find((source) => source.pattern.test(normalized));
  return match ? { url: match.url, type: match.type } : null;
}

export function extractReadableTextFromHtml(html: string): string | null {
  const $ = cheerio.load(html);
  $("script, style, nav, footer, header, noscript").remove();
  const text = selectReadableRoot($).text();

  const cleaned = cleanText(text);
  return cleaned ? cleaned.slice(0, MAX_HTML_TEXT_LENGTH) : null;
}

export function extractReadableHtmlFromHtml(html: string, baseUrl: string): string | null {
  const $ = cheerio.load(html);
  $("script, style, nav, footer, header, noscript, iframe, form, aside:not([data='primary-post'])").remove();
  const root = selectReadableRoot($);

  sanitizeReadableHtml($, root, baseUrl);
  const innerHtml = cleanReadableHtml(root.html() ?? "");
  const text = cleanText(root.text());
  if (!innerHtml || text.length < 30) return null;
  return encodeRichHtmlContent(`<article>${innerHtml}</article>`);
}

function selectReadableRoot($: cheerio.CheerioAPI): cheerio.Cheerio<AnyNode> {
  const selectors = [
    ".post-entry",
    ".entry-content",
    ".post-content",
    ".article-content",
    "article",
    "main",
    "[role='main']",
    "body"
  ];
  for (const selector of selectors) {
    const root = $(selector).first();
    if (root.length) return root;
  }
  return $("body").first();
}

async function fetchContentSource(source: ContentSource): Promise<string | null> {
  const response = await fetch(source.url, {
    headers: {
      accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,application/pdf,text/plain;q=0.8,*/*;q=0.7",
      "accept-language": "en-US,en;q=0.9",
      "cache-control": "no-cache",
      pragma: "no-cache",
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "none",
      "upgrade-insecure-requests": "1",
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
    },
    next: { revalidate: 0 }
  } as RequestInit & { next: { revalidate: number } });

  if (!response.ok) return null;

  const contentType = response.headers.get("content-type") ?? "";
  if (source.type === "pdf" || contentType.includes("pdf")) {
    const text = await extractPdfText(Buffer.from(await response.arrayBuffer()));
    return text && !isBlockedPage(text) ? text.slice(0, MAX_TEXT_LENGTH) : null;
  }

  const body = await response.text();
  const text = contentType.includes("html") || source.type === "html"
    ? extractReadableHtmlFromHtml(body, source.url) ?? extractReadableTextFromHtml(body)
    : cleanText(body).slice(0, 12000);

  return text && !isBlockedPage(text) ? text : null;
}

async function extractPdfText(buffer: Buffer): Promise<string | null> {
  const workDir = await mkdtemp(path.join(tmpdir(), "ai-morning-brief-pdf-"));
  const pdfPath = path.join(workDir, "article.pdf");

  try {
    await writeFile(pdfPath, buffer);

    for (const binary of pdftotextCandidates()) {
      try {
        const { stdout } = await runFile(binary, [pdfPath, "-"], { maxBuffer: 50 * 1024 * 1024 });
        const text = cleanText(stdout);
        if (text) return text;
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code !== "ENOENT") break;
      }
    }
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }

  return null;
}

function pdftotextCandidates(): string[] {
  return [
    process.env.PDFTOTEXT_PATH,
    "/opt/homebrew/bin/pdftotext",
    "/usr/local/bin/pdftotext",
    existsSync("/opt/homebrew/bin/pdftotext") ? undefined : "pdftotext"
  ].filter(Boolean) as string[];
}

function isBlockedPage(text: string): boolean {
  const lowered = text.toLowerCase();
  return [
    "attention required",
    "cloudflare",
    "you have been blocked",
    "access denied",
    "enable javascript and cookies"
  ].some((marker) => lowered.includes(marker));
}

function normalizeComparableText(value?: string | null): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function sanitizeReadableHtml($: cheerio.CheerioAPI, root: cheerio.Cheerio<AnyNode>, baseUrl: string) {
  const allowedTags = new Set([
    "a",
    "article",
    "blockquote",
    "br",
    "code",
    "del",
    "em",
    "figcaption",
    "figure",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "hr",
    "i",
    "img",
    "li",
    "ol",
    "p",
    "pre",
    "s",
    "section",
    "span",
    "strong",
    "sub",
    "sup",
    "table",
    "tbody",
    "td",
    "tfoot",
    "th",
    "thead",
    "tr",
    "ul"
  ]);

  root.find("*").each((_, node) => {
    const element = $(node);
    const tagName = node.type === "tag" ? node.name.toLowerCase() : "";
    if (!allowedTags.has(tagName)) {
      element.replaceWith(element.contents());
      return;
    }

    for (const attributeName of Object.keys(node.attribs ?? {})) {
      if (!allowedAttribute(tagName, attributeName)) element.removeAttr(attributeName);
    }

    if (tagName === "a") sanitizeLink(element, baseUrl);
    if (tagName === "img") sanitizeImage(element, baseUrl);
  });
}

function allowedAttribute(tagName: string, attributeName: string): boolean {
  const name = attributeName.toLowerCase();
  if (name.startsWith("on") || name === "style" || name === "class" || name === "id") return false;
  if (tagName === "a") return ["href", "title"].includes(name);
  if (tagName === "img") return ["src", "alt", "title", "width", "height"].includes(name);
  if (["td", "th"].includes(tagName)) return ["colspan", "rowspan"].includes(name);
  return false;
}

function sanitizeLink(element: cheerio.Cheerio<AnyNode>, baseUrl: string) {
  const href = resolveReadableUrl(element.attr("href"), baseUrl);
  if (!href) {
    element.removeAttr("href");
    return;
  }
  element.attr("href", href);
  element.attr("target", "_blank");
  element.attr("rel", "noreferrer");
  element.attr("draggable", "false");
}

function sanitizeImage(element: cheerio.Cheerio<AnyNode>, baseUrl: string) {
  const src = resolveReadableUrl(element.attr("src") || element.attr("data-src"), baseUrl);
  if (!src) {
    element.remove();
    return;
  }
  element.attr("src", src);
  element.attr("loading", "lazy");
  element.attr("decoding", "async");
  element.attr("draggable", "false");
}

function resolveReadableUrl(value: string | undefined, baseUrl: string): string | null {
  if (!value) return null;
  try {
    const url = new URL(value, baseUrl);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function cleanReadableHtml(html: string): string {
  return html.replace(/\s+/g, " ").replace(/>\s+</g, "><").trim().slice(0, MAX_HTML_TEXT_LENGTH);
}
