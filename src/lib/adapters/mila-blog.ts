import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";

import { itemDisplayTimestamp } from "../date-format";
import { canonicalizeUrl, cleanText } from "../normalization";
import type { RawItem } from "../types";

type ExtractMilaBlogItemsInput = {
  sourceId: string;
  sourceName: string;
  baseUrl: string;
  html: string;
};

export function extractMilaBlogItems(input: ExtractMilaBlogItemsInput): RawItem[] {
  const $ = cheerio.load(input.html);
  const items: RawItem[] = [];
  const seen = new Set<string>();

  $(".node--type-article.node--view-mode-teaser").each((_, node) => {
    const titleLink = $(node).find(".field-name-node-title a[href]").first();
    const link = titleLink.length > 0 ? titleLink : firstTextArticleLink($, node);
    const href = link.attr("href");
    const title = cleanText(link.text());
    if (!href || !title) return;

    const canonicalUrl = canonicalizeUrl(new URL(href, input.baseUrl).toString());
    if (seen.has(canonicalUrl)) return;
    seen.add(canonicalUrl);

    const authors = extractMilaAuthors($, node);
    items.push({
      sourceId: input.sourceId,
      sourceName: input.sourceName,
      title,
      canonicalUrl,
      publishedAt: extractMilaDate($, node),
      excerpt: authors.length > 0 ? `By ${authors.join(", ")}` : title,
      categories: ["Mila"]
    });
  });

  return items.sort((a, b) => itemDisplayTimestamp(b.publishedAt) - itemDisplayTimestamp(a.publishedAt));
}

export async function fetchMilaBlogItems(input: {
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
  const items = extractMilaBlogItems({
    sourceId: input.sourceId,
    sourceName: input.sourceName,
    baseUrl: input.url,
    html: await response.text()
  });
  return typeof input.maxItems === "number" ? items.slice(0, input.maxItems) : items;
}

function extractMilaDate($: cheerio.CheerioAPI, node: AnyNode): string | null {
  const explicit = cleanText($(node).find(".field-name-node-post-date .field-item").first().text());
  if (explicit) return explicit;
  const text = cleanText($(node).text());
  return text.match(/[A-Z][a-z]{2,8}\s+\d{1,2},\s+\d{4}/)?.[0] ?? null;
}

function extractMilaAuthors($: cheerio.CheerioAPI, node: AnyNode): string[] {
  const names = new Set<string>();
  $(node)
    .find(".field-name-field-blocks1 .authors a[href*='/directory/']")
    .each((_, link) => {
      const name = cleanText($(link).text());
      if (name) names.add(name);
    });
  return Array.from(names);
}

function firstTextArticleLink($: cheerio.CheerioAPI, node: AnyNode): cheerio.Cheerio<AnyNode> {
  const links = $(node).find("a[href*='/en/article/']");
  for (const link of links.toArray()) {
    if (cleanText($(link).text())) return $(link);
  }
  return links.first();
}
