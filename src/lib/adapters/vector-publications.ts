import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";

import { canonicalizeUrl, cleanText } from "../normalization";
import type { RawItem } from "../types";

type ExtractVectorPublicationItemsInput = {
  sourceId: string;
  sourceName: string;
  baseUrl: string;
  html: string;
};

export function extractVectorPublicationItems(input: ExtractVectorPublicationItemsInput): RawItem[] {
  const $ = cheerio.load(input.html);
  const items: RawItem[] = [];
  const seen = new Set<string>();

  $("article.tease-publications").each((_, node) => {
    const link = $(node).find("a.tease__anchor[href]").first();
    const href = link.attr("href");
    const title = cleanText($(node).find(".tease__title").first().text()) || cleanText(link.attr("aria-label") ?? "");
    if (!href || !title) return;

    const canonicalUrl = canonicalizeUrl(new URL(href, input.baseUrl).toString());
    if (seen.has(canonicalUrl)) return;
    seen.add(canonicalUrl);

    const authors = extractVectorAuthors($, node);
    const year = extractVectorYear($, node);
    const source = extractVectorSource($, node, year);
    const details = [authors ? `Authors: ${authors}` : null, source ? `Source: ${source}` : null]
      .filter(Boolean)
      .join("\n");

    items.push({
      sourceId: input.sourceId,
      sourceName: input.sourceName,
      title,
      canonicalUrl,
      publishedAt: year,
      excerpt: authors || source || title,
      content: details ? `${details}\nLink: ${canonicalUrl}` : `Link: ${canonicalUrl}`,
      categories: ["Vector Institute", "paper"]
    });
  });

  return items;
}

export async function fetchVectorPublicationItems(input: {
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
  const items = extractVectorPublicationItems({
    sourceId: input.sourceId,
    sourceName: input.sourceName,
    baseUrl: input.url,
    html: await response.text()
  });
  return typeof input.maxItems === "number" ? items.slice(0, input.maxItems) : items;
}

function extractVectorAuthors($: cheerio.CheerioAPI, node: AnyNode): string {
  return cleanText($(node).find(".tease__authors").first().text());
}

function extractVectorYear($: cheerio.CheerioAPI, node: AnyNode): string | null {
  const explicit = cleanText($(node).find(".tease__year").first().text());
  const match = explicit.match(/\b(19|20)\d{2}\b/);
  if (match) return match[0] ?? null;

  const text = cleanText($(node).text());
  return text.match(/\b(19|20)\d{2}\b/)?.[0] ?? null;
}

function extractVectorSource($: cheerio.CheerioAPI, node: AnyNode, year: string | null): string {
  const text = cleanText($(node).find(".tease__source").first().text());
  if (!text || !year) return text;
  return cleanText(text.replace(year, ""));
}
