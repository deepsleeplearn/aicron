import * as cheerio from "cheerio";

import { canonicalizeUrl, cleanText } from "../normalization";
import type { RawItem } from "../types";

export function extractClaudeBlogItems(input: {
  sourceId: string;
  sourceName: string;
  baseUrl: string;
  html: string;
}): RawItem[] {
  const $ = cheerio.load(input.html);
  const seen = new Set<string>();
  const items: RawItem[] = [];

  $(".blog_cms_item").each((_, node) => {
    const href = $(node).find('a[href^="/blog/"]').first().attr("href");
    const title = cleanText($(node).find(".card_blog_title").first().text());
    const rawDate = cleanText($(node).find(".u-text-style-caption").first().text());
    const categories = $(node)
      .find(".card-main_tag-wrap")
      .toArray()
      .map((element) => cleanText($(element).text()))
      .filter(Boolean);

    if (!href || !title) return;
    const canonicalUrl = canonicalizeUrl(new URL(href, input.baseUrl).toString());
    if (seen.has(canonicalUrl)) return;
    seen.add(canonicalUrl);

    items.push({
      sourceId: input.sourceId,
      sourceName: input.sourceName,
      title,
      canonicalUrl,
      publishedAt: normalizeClaudeBlogDate(rawDate),
      excerpt: title,
      content: [title, rawDate, ...categories].filter(Boolean).join("\n"),
      categories: categories.length > 0 ? categories : ["Claude"]
    });
  });

  return items.slice(0, 40);
}

export async function fetchClaudeBlogItems(input: {
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
  return extractClaudeBlogItems({
    sourceId: input.sourceId,
    sourceName: input.sourceName,
    baseUrl: input.url,
    html: await response.text()
  });
}

function normalizeClaudeBlogDate(value: string): string | null {
  const match = value.match(/^([A-Z][a-z]{2})\s+(\d{1,2}),\s+(\d{4})$/);
  if (!match) return value || null;
  const month = monthToNumber(match[1]);
  if (!month) return value;
  return `${match[3]}-${String(month).padStart(2, "0")}-${match[2].padStart(2, "0")}`;
}

function monthToNumber(month: string): number | null {
  const index = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].indexOf(
    month
  );
  return index >= 0 ? index + 1 : null;
}
