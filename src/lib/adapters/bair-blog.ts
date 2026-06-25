import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";

import { itemDisplayTimestamp } from "../date-format";
import { canonicalizeUrl, cleanText } from "../normalization";
import type { RawItem } from "../types";

type ExtractBairBlogItemsInput = {
  sourceId: string;
  sourceName: string;
  baseUrl: string;
  html: string;
};

export function extractBairBlogItems(input: ExtractBairBlogItemsInput): RawItem[] {
  const $ = cheerio.load(input.html);
  const items: RawItem[] = [];
  const seen = new Set<string>();

  $(".posts .post").each((_, node) => {
    const link = $(node).find("a.post-link[href]").first();
    const href = link.attr("href");
    const title = cleanText(link.text());
    if (!href || !title) return;

    const canonicalUrl = canonicalizeUrl(new URL(href, input.baseUrl).toString());
    if (seen.has(canonicalUrl)) return;
    seen.add(canonicalUrl);

    items.push({
      sourceId: input.sourceId,
      sourceName: input.sourceName,
      title,
      canonicalUrl,
      publishedAt: extractBairPostDate($, node),
      excerpt: cleanText($(node).find(".post-summary").first().text()) || title,
      categories: ["BAIR"]
    });
  });

  return items.sort((a, b) => itemDisplayTimestamp(b.publishedAt) - itemDisplayTimestamp(a.publishedAt));
}

export async function fetchBairBlogItems(input: {
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
  const items = extractBairBlogItems({
    sourceId: input.sourceId,
    sourceName: input.sourceName,
    baseUrl: input.url,
    html: await response.text()
  });
  return typeof input.maxItems === "number" ? items.slice(0, input.maxItems) : items;
}

function extractBairPostDate($: cheerio.CheerioAPI, node: AnyNode): string | null {
  for (const meta of $(node).find(".post-meta").toArray()) {
    const text = cleanText($(meta).text());
    const date = text.match(/^[A-Z][a-z]{2,8}\s+\d{1,2},\s+\d{4}$/)?.[0];
    if (date) return date;
  }
  return null;
}
