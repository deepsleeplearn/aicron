import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";

import { itemDisplayTimestamp } from "../date-format";
import { canonicalizeUrl, cleanText } from "../normalization";
import type { RawItem } from "../types";

type ExtractCmuMlBlogItemsInput = {
  sourceId: string;
  sourceName: string;
  baseUrl: string;
  html: string;
};

type CmuJsonLdPost = {
  url?: unknown;
  headline?: unknown;
  datePublished?: unknown;
  description?: unknown;
  articleSection?: unknown;
};

export function extractCmuMlBlogItems(input: ExtractCmuMlBlogItemsInput): RawItem[] {
  const fromJsonLd = extractCmuJsonLdItems(input);
  if (fromJsonLd.length > 0) return fromJsonLd;
  return extractCmuDomItems(input);
}

export async function fetchCmuMlBlogItems(input: {
  sourceId: string;
  sourceName: string;
  url: string;
  maxItems?: number;
}): Promise<RawItem[]> {
  const response = await fetch(input.url, {
    headers: { "user-agent": "ai-morning-brief/0.1" },
    next: { revalidate: 0 }
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} while fetching ${input.url}`);
  }
  const items = extractCmuMlBlogItems({
    sourceId: input.sourceId,
    sourceName: input.sourceName,
    baseUrl: input.url,
    html: await response.text()
  });
  return typeof input.maxItems === "number" ? items.slice(0, input.maxItems) : items;
}

function extractCmuJsonLdItems(input: ExtractCmuMlBlogItemsInput): RawItem[] {
  const $ = cheerio.load(input.html);
  const items: RawItem[] = [];
  const seen = new Set<string>();

  $("script[type='application/ld+json']").each((_, node) => {
    const payload = parseJsonLd($(node).text());
    const posts = collectBlogPosts(payload);
    for (const post of posts) {
      const url = typeof post.url === "string" ? post.url : null;
      const title = typeof post.headline === "string" ? cleanText(post.headline) : "";
      if (!url || !title) continue;

      const canonicalUrl = canonicalizeUrl(new URL(url, input.baseUrl).toString());
      if (seen.has(canonicalUrl)) continue;
      seen.add(canonicalUrl);

      items.push({
        sourceId: input.sourceId,
        sourceName: input.sourceName,
        title,
        canonicalUrl,
        publishedAt: formatCmuDateOnly(typeof post.datePublished === "string" ? post.datePublished : null),
        excerpt: cleanText(typeof post.description === "string" ? post.description : "") || title,
        categories: cmuCategories(post.articleSection)
      });
    }
  });

  return sortCmuItems(items);
}

function extractCmuDomItems(input: ExtractCmuMlBlogItemsInput): RawItem[] {
  const $ = cheerio.load(input.html);
  const items: RawItem[] = [];
  const seen = new Set<string>();

  $("article, .post").each((_, node) => {
    const link = $(node)
      .find("a[href*='blog.ml.cmu.edu/20'], a[href^='/20']")
      .filter(
        (_, linkNode) =>
          Boolean(cleanText($(linkNode).find("h1,h2,h3,h4").text()) || cleanText($(linkNode).text()))
      )
      .first();
    const href = link.attr("href");
    const title = cleanText(link.find("h1,h2,h3,h4").first().text()) || cleanText(link.text());
    if (!href || !title) return;

    const canonicalUrl = canonicalizeUrl(new URL(href, input.baseUrl).toString());
    if (seen.has(canonicalUrl)) return;
    seen.add(canonicalUrl);

    items.push({
      sourceId: input.sourceId,
      sourceName: input.sourceName,
      title,
      canonicalUrl,
      publishedAt: extractCmuDomDate($, node),
      excerpt: extractCmuDomExcerpt($, node, title),
      categories: extractCmuDomCategories($, node)
    });
  });

  return sortCmuItems(items);
}

function parseJsonLd(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function collectBlogPosts(payload: unknown): CmuJsonLdPost[] {
  const values = Array.isArray(payload) ? payload : [payload];
  const posts: CmuJsonLdPost[] = [];

  for (const value of values) {
    if (!value || typeof value !== "object") continue;
    const record = value as Record<string, unknown>;
    const blogPost = record.blogPost;
    if (Array.isArray(blogPost)) {
      posts.push(...(blogPost.filter((post) => post && typeof post === "object") as CmuJsonLdPost[]));
    }
  }

  return posts;
}

function formatCmuDateOnly(value: string | null): string | null {
  if (!value) return null;
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return null;
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "America/New_York"
  }).format(new Date(timestamp));
}

function cmuCategories(section: unknown): string[] {
  const labels = new Set<string>(["CMU ML"]);
  if (typeof section === "string") labels.add(section);
  if (Array.isArray(section)) {
    for (const value of section) {
      if (typeof value === "string" && value.trim()) labels.add(value);
    }
  }
  return Array.from(labels);
}

function extractCmuDomDate($: cheerio.CheerioAPI, node: AnyNode): string | null {
  const time = cleanText($(node).find("time").first().text());
  if (time) return time;
  const text = cleanText($(node).text());
  return text.match(/[A-Z][a-z]{2,8}\s+\d{1,2},\s+\d{4}/)?.[0] ?? null;
}

function extractCmuDomExcerpt($: cheerio.CheerioAPI, node: AnyNode, title: string): string {
  const paragraphs = $(node)
    .find("p")
    .toArray()
    .map((paragraph) => cleanText($(paragraph).text()))
    .filter((text) => text && !text.includes(" / ") && text !== title);
  return paragraphs[0] ?? title;
}

function extractCmuDomCategories($: cheerio.CheerioAPI, node: AnyNode): string[] {
  const labels = new Set<string>(["CMU ML"]);
  $(node)
    .find("a[href*='/category/'], a[href*='/tag/']")
    .each((_, link) => {
      const label = cleanText($(link).text());
      if (label) labels.add(label);
    });
  return Array.from(labels);
}

function sortCmuItems(items: RawItem[]): RawItem[] {
  return items.sort((a, b) => itemDisplayTimestamp(b.publishedAt) - itemDisplayTimestamp(a.publishedAt));
}
