import Parser from "rss-parser";
import * as cheerio from "cheerio";

import { canonicalizeUrl, cleanText } from "../normalization";
import type { RawItem } from "../types";

const parser = new Parser();

type RssLikeItem = {
  title?: string;
  link?: string;
  isoDate?: string;
  pubDate?: string;
  content?: string;
  contentSnippet?: string;
  summary?: string;
  categories?: string[];
  [key: string]: unknown;
};

export async function fetchRssItems(input: {
  sourceId: string;
  sourceName: string;
  url: string;
}): Promise<RawItem[]> {
  const feed = await parser.parseURL(input.url);
  return normalizeRssItems({ ...input, items: feed.items });
}

export function normalizeRssItems(input: {
  sourceId: string;
  sourceName: string;
  url: string;
  items: RssLikeItem[];
}): RawItem[] {
  return input.items
    .filter((item) => item.title && item.link)
    .map((item, index) => {
      const encodedContent = typeof item["content:encoded"] === "string" ? item["content:encoded"] : item.content;
      return {
        sourceId: input.sourceId,
        sourceName: input.sourceName,
        title: cleanText(item.title ?? "Untitled"),
        canonicalUrl: canonicalizeUrl(new URL(item.link ?? input.url, input.url).toString()),
        publishedAt: item.isoDate ?? item.pubDate ?? null,
        content: encodedContent ? cleanRichText(encodedContent) : null,
        excerpt: item.contentSnippet ? cleanText(item.contentSnippet) : item.summary ? cleanRichText(item.summary) : null,
        categories: item.categories ?? [],
        originalIndex: index
      };
    })
    .sort((a, b) => {
      const delta = itemTimestamp(b.publishedAt) - itemTimestamp(a.publishedAt);
      return delta === 0 ? a.originalIndex - b.originalIndex : delta;
    })
    .slice(0, 50)
    .map(({ originalIndex: _originalIndex, ...item }) => item);
}

function itemTimestamp(value: string | null | undefined): number {
  if (!value) return 0;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function cleanRichText(value: string): string {
  if (!/<[a-z][\s\S]*>/i.test(value)) return cleanText(value);
  const spacedHtml = value.replace(
    /<(?:br|\/(?:p|div|h[1-6]|li|ul|ol|figure|section|article|blockquote|tr|td|th))\b[^>]*>/gi,
    " $& "
  );
  const $ = cheerio.load(spacedHtml);
  $("script, style, nav, footer, header, noscript, svg").remove();
  return cleanText($.root().text());
}
