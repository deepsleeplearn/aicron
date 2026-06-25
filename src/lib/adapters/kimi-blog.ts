import * as cheerio from "cheerio";
import type { Element } from "domhandler";

import { canonicalizeUrl, cleanText } from "../normalization";
import type { RawItem } from "../types";

type KimiCandidate = {
  title: string;
  url: string;
  publishedAt?: string | null;
  excerpt?: string | null;
};

export function extractKimiBlogItems(input: {
  sourceId: string;
  sourceName: string;
  baseUrl: string;
  html: string;
}): RawItem[] {
  const $ = cheerio.load(input.html);
  const candidates = [
    ...extractLinkCandidates($, input.baseUrl),
    ...extractScriptCandidates(input.html, input.baseUrl)
  ];

  const seen = new Set<string>();
  const items: RawItem[] = [];
  for (const candidate of candidates) {
    const canonicalUrl = canonicalizeUrl(candidate.url);
    if (seen.has(canonicalUrl)) continue;
    seen.add(canonicalUrl);

    const title = cleanText(candidate.title);
    if (!title || title.length < 4) continue;

    items.push({
      sourceId: input.sourceId,
      sourceName: input.sourceName,
      title,
      canonicalUrl,
      publishedAt: candidate.publishedAt ?? null,
      excerpt: candidate.excerpt || title,
      content: [title, candidate.excerpt].filter(Boolean).join("\n"),
      categories: ["Kimi", "Moonshot"]
    });
  }

  return items.slice(0, 40);
}

export async function fetchKimiBlogItems(input: {
  sourceId: string;
  sourceName: string;
  url: string;
}): Promise<RawItem[]> {
  const response = await fetch(input.url, {
    headers: {
      accept: "text/html,application/xhtml+xml",
      "user-agent": "ai-morning-brief/0.1"
    },
    next: { revalidate: 0 }
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} while fetching ${input.url}`);
  return extractKimiBlogItems({
    sourceId: input.sourceId,
    sourceName: input.sourceName,
    baseUrl: input.url,
    html: await response.text()
  });
}

function extractLinkCandidates($: cheerio.CheerioAPI, baseUrl: string): KimiCandidate[] {
  const candidates: KimiCandidate[] = [];
  $("a[href]").each((_, node) => {
    const href = $(node).attr("href");
    if (!href) return;

    let url: URL;
    try {
      url = new URL(href, baseUrl);
    } catch {
      return;
    }
    if (!isKimiArticleUrl(url)) return;

    const title = extractTitle($, node, url);
    if (!title) return;

    candidates.push({
      title,
      url: url.toString(),
      publishedAt: extractPublishedAt($, node),
      excerpt: extractExcerpt($, node, title)
    });
  });
  return candidates;
}

function extractTitle($: cheerio.CheerioAPI, node: Element, url: URL): string {
  const heading = cleanText($(node).find("h1, h2, h3, h4").first().text());
  if (heading) return heading;

  const titledElement = cleanText($(node).find("[class*='title'], [class*='Title']").first().text());
  if (titledElement) return titledElement;

  const text = cleanText($(node).text());
  if (text && !isGenericLabel(text)) return text;

  return titleFromSlug(url);
}

function extractExcerpt($: cheerio.CheerioAPI, node: Element, title: string): string | null {
  const paragraph = cleanText($(node).find("p").first().text());
  if (paragraph && paragraph !== title) return paragraph;

  const containerText = cleanText($(node).closest("article, li, section, div").text());
  if (!containerText || containerText === title) return null;
  return containerText.replace(title, "").trim().slice(0, 320) || null;
}

function extractPublishedAt($: cheerio.CheerioAPI, node: Element): string | null {
  const time = $(node).find("time").first();
  const datetime = time.attr("datetime");
  const timeText = cleanText(time.text());
  if (datetime || timeText) return datetime || timeText;

  const text = cleanText($(node).text());
  return (
    text.match(/\b\d{4}-\d{2}-\d{2}\b/)?.[0] ??
    text.match(/\b[A-Z][a-z]{2}\s+\d{1,2},\s+\d{4}\b/)?.[0] ??
    null
  );
}

function extractScriptCandidates(html: string, baseUrl: string): KimiCandidate[] {
  const candidates: KimiCandidate[] = [];
  const normalizedHtml = html.replaceAll("\\/", "/").replace(/\\u002F/g, "/");
  const urlPattern = /(?:https?:\/\/(?:www\.)?kimi\.com)?\/(?:blog|research)\/[A-Za-z0-9][^"'\\<>\s)]*/g;

  for (const match of normalizedHtml.matchAll(urlPattern)) {
    let url: URL;
    try {
      url = new URL(match[0], baseUrl);
    } catch {
      continue;
    }
    if (!isKimiArticleUrl(url)) continue;

    const context = cleanScriptContext(normalizedHtml.slice(Math.max(0, match.index - 900), match.index + 900));
    const title = extractScriptTitle(context, url);
    if (!title) continue;

    candidates.push({
      title,
      url: url.toString(),
      publishedAt: extractDateFromText(context),
      excerpt: context
    });
  }
  return candidates;
}

function extractScriptTitle(context: string, url: URL): string {
  const knownTitle = extractJsonTextField(context, ["title", "name", "headline"]);
  if (knownTitle) return knownTitle;

  const quotedTitle = context.match(/"([^"]*(?:Kimi|Moonshot|Agentic|LLM|Reasoning|Audio|Linear)[^"]*)"/i)?.[1];
  if (quotedTitle) return cleanScriptText(quotedTitle);

  return titleFromSlug(url);
}

function extractJsonTextField(context: string, fieldNames: string[]): string | null {
  for (const fieldName of fieldNames) {
    const pattern = new RegExp(`"${fieldName}"\\s*:\\s*"([^"]{4,180})"`, "i");
    const value = context.match(pattern)?.[1];
    if (!value) continue;
    const cleaned = cleanScriptText(value);
    if (cleaned && !/^https?:\/\//.test(cleaned) && !isGenericLabel(cleaned)) return cleaned;
  }
  return null;
}

function cleanScriptContext(text: string): string {
  return cleanText(
    text
      .replace(/\\u([\dA-Fa-f]{4})/g, (_, code) => String.fromCharCode(Number.parseInt(code, 16)))
      .replace(/\\"/g, '"')
      .replace(/\\n/g, " ")
      .replace(/<[^>]+>/g, " ")
  ).slice(0, 360);
}

function cleanScriptText(text: string): string {
  return cleanText(
    text
      .replace(/\\u([\dA-Fa-f]{4})/g, (_, code) => String.fromCharCode(Number.parseInt(code, 16)))
      .replace(/\\"/g, '"')
      .replace(/\\n/g, " ")
  );
}

function extractDateFromText(text: string): string | null {
  return (
    text.match(/\b\d{4}-\d{2}-\d{2}\b/)?.[0] ??
    text.match(/\b[A-Z][a-z]{2}\s+\d{1,2},\s+\d{4}\b/)?.[0] ??
    null
  );
}

function isKimiArticleUrl(url: URL): boolean {
  if (url.hostname !== "www.kimi.com" && url.hostname !== "kimi.com") return false;
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length < 2) return false;
  if (parts[0] !== "blog" && parts[0] !== "research") return false;
  if (["assets", "static", "_next", "chunks"].includes(parts[1] ?? "")) return false;

  const lastPart = parts.at(-1) ?? "";
  if (["blog", "research", "tag", "category"].includes(lastPart)) return false;
  if (/\.(css|js|mjs|woff2?|ttf|otf|png|jpe?g|webp|svg|ico|json|map)$/i.test(lastPart)) return false;
  return true;
}

function isGenericLabel(text: string): boolean {
  return /^(blog|research|article|read more|learn more|github|hugging face|try kimi)$/i.test(text.trim());
}

function titleFromSlug(url: URL): string {
  const slug = decodeURIComponent(url.pathname.split("/").filter(Boolean).at(-1) ?? "");
  return slug.replace(/[-_]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}
