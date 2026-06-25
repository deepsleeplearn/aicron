import * as cheerio from "cheerio";

import { fetchArticleContent } from "../content";
import { canonicalizeUrl, cleanText } from "../normalization";
import type { RawItem } from "../types";

export function extractOpenAIDevelopersBlogItems(input: {
  sourceId: string;
  sourceName: string;
  baseUrl: string;
  html: string;
  contentByCanonicalUrl?: Record<string, string>;
}): RawItem[] {
  const $ = cheerio.load(input.html);
  const seen = new Set<string>();
  const items: RawItem[] = [];
  const dateState = { year: new Date().getFullYear(), lastMonth: 13 };

  $("a[href^='/blog/']").each((_, node) => {
    const href = $(node).attr("href");
    if (!href || href === "/blog" || href.startsWith("/blog/topic/")) return;

    const url = new URL(href, input.baseUrl);
    const canonicalUrl = canonicalizeUrl(url.toString());
    if (seen.has(canonicalUrl)) return;

    const title = cleanText(
      $(node).find(".line-clamp-2").first().text() ||
        $(node).find("img[alt]").first().attr("alt") ||
        $(node).text()
    );
    if (!title || title.length < 4) return;

    const excerpt = cleanText($(node).find("p").first().text()) || title;
    const publishedAt = normalizeBlogDate(cleanText($(node).find(".text-secondary").first().text()), dateState);
    const topic = cleanText($(node).find(".text-sm.text-secondary").last().text());
    if (!publishedAt && excerpt === title) return;
    seen.add(canonicalUrl);
    items.push({
      sourceId: input.sourceId,
      sourceName: input.sourceName,
      title,
      canonicalUrl,
      publishedAt,
      excerpt,
      content: input.contentByCanonicalUrl?.[canonicalUrl] ?? excerpt,
      categories: ["blog", topic || "developer"]
    });
  });

  return items.slice(0, 30);
}

export function extractOpenAICodexChangelogItems(input: {
  sourceId: string;
  sourceName: string;
  baseUrl: string;
  html: string;
}): RawItem[] {
  const $ = cheerio.load(input.html);
  const items: RawItem[] = [];
  const seen = new Set<string>();

  $("h3").each((_, heading) => {
    const title = cleanText($(heading).text());
    if (!title || isChangelogChrome(title)) return;

    const parent = $(heading).parent();
    const publishedAt = cleanText(parent.find("time").first().text()) || null;
    if (!publishedAt || !/^\d{4}-\d{2}-\d{2}$/.test(publishedAt)) return;

    const anchor =
      parent.find("button[data-anchor-id]").first().attr("data-anchor-id") ||
      slugify(`${publishedAt}-${title}`);
    const canonicalUrl = `${canonicalizeUrl(input.baseUrl)}#${anchor}`;
    if (seen.has(canonicalUrl)) return;

    const article = parent.next("article");
    const excerpt = cleanText(article.text()).slice(0, 420) || title;
    seen.add(canonicalUrl);
    items.push({
      sourceId: input.sourceId,
      sourceName: input.sourceName,
      title,
      canonicalUrl,
      publishedAt,
      excerpt,
      content: excerpt,
      categories: ["changelog", classifyCodexChange(title)]
    });
  });

  return items.slice(0, 40);
}

export async function fetchOpenAIDevelopersBlogItems(input: {
  sourceId: string;
  sourceName: string;
  url: string;
  maxItems?: number;
}): Promise<RawItem[]> {
  const html = await fetchHtml(input.url);
  const items = extractOpenAIDevelopersBlogItems({
    sourceId: input.sourceId,
    sourceName: input.sourceName,
    baseUrl: input.url,
    html
  });
  return hydrateDeveloperBlogContent(typeof input.maxItems === "number" ? items.slice(0, input.maxItems) : items);
}

export async function fetchOpenAICodexChangelogItems(input: {
  sourceId: string;
  sourceName: string;
  url: string;
}): Promise<RawItem[]> {
  const html = await fetchHtml(input.url);
  return extractOpenAICodexChangelogItems({
    sourceId: input.sourceId,
    sourceName: input.sourceName,
    baseUrl: input.url,
    html
  });
}

async function fetchHtml(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      accept: "text/html,application/xhtml+xml",
      "user-agent": "ai-morning-brief/0.1"
    },
    next: { revalidate: 0 }
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} while fetching ${url}`);
  return response.text();
}

async function hydrateDeveloperBlogContent(items: RawItem[]): Promise<RawItem[]> {
  const hydrated: RawItem[] = [];
  for (const item of items) {
    const content = await fetchArticleContent(item.canonicalUrl).catch(() => null);
    hydrated.push(content ? { ...item, content } : item);
  }
  return hydrated;
}

function isChangelogChrome(title: string): boolean {
  return /^(All updates|General|Codex app|Codex Mobile|Codex CLI)$/i.test(title);
}

function classifyCodexChange(title: string): string {
  if (/CLI/i.test(title)) return "Codex CLI";
  if (/iOS|Mobile/i.test(title)) return "Codex Mobile";
  if (/app|Chrome|Computer Use|Memories|Chronicle/i.test(title)) return "Codex app";
  if (/GPT|model/i.test(title)) return "model";
  return "Codex";
}

function normalizeBlogDate(
  value: string,
  state: { year: number; lastMonth: number }
): string | null {
  const match = value.match(/^([A-Z][a-z]{2})\s+(\d{1,2})$/);
  if (!match) return null;
  const month = monthToNumber(match[1]);
  const day = Number.parseInt(match[2], 10);
  if (!month || !day) return null;
  if (month > state.lastMonth) state.year -= 1;
  state.lastMonth = month;
  return `${state.year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function monthToNumber(month: string): number | null {
  const index = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].indexOf(
    month
  );
  return index >= 0 ? index + 1 : null;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
