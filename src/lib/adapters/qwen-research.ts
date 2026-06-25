import * as cheerio from "cheerio";

import { canonicalizeUrl, cleanText } from "../normalization";
import type { RawItem } from "../types";

type QwenResearchRecord = {
  date?: string;
  title?: string;
  id?: string;
  introduction?: string;
  description?: string;
  tags?: string[];
  tokenLinks?: string;
};

type QwenArticleRecord = {
  id?: string;
  title?: string;
  path?: string;
  content?: string;
  extra?: {
    date?: string;
    description?: string;
    introduction?: string;
    tags?: string[];
  };
};

export function parseQwenResearchItems(input: {
  sourceId: string;
  sourceName: string;
  records: QwenResearchRecord[];
}): RawItem[] {
  return input.records
    .filter((record) => record.title && record.id)
    .sort((a, b) => itemTime(b.date) - itemTime(a.date))
    .map((record) => {
      const id = cleanText(record.id ?? "");
      const title = cleanText(record.title ?? "Untitled");
      const excerpt = cleanArticleText(record.introduction || record.description || title);

      return {
        sourceId: input.sourceId,
        sourceName: input.sourceName,
        title,
        canonicalUrl: canonicalizeUrl(`https://qwen.ai/research/${encodeURIComponent(id)}`),
        publishedAt: record.date ?? null,
        excerpt,
        content: excerpt,
        categories: record.tags ?? []
      };
    });
}

export function parseQwenResearchArticles(input: {
  sourceId: string;
  sourceName: string;
  articles: QwenArticleRecord[];
}): RawItem[] {
  return input.articles
    .filter((article) => article.title && article.path)
    .sort((a, b) => itemTime(b.extra?.date) - itemTime(a.extra?.date))
    .map((article) => {
      const path = cleanText(article.path ?? "");
      const title = cleanText(article.title ?? "Untitled");
      const excerpt = cleanArticleText(article.extra?.introduction || article.extra?.description || title);
      const content = extractArticleText(article.content) || excerpt;

      return {
        sourceId: input.sourceId,
        sourceName: input.sourceName,
        title,
        canonicalUrl: canonicalizeUrl(`https://qwen.ai/research/${encodeURIComponent(path)}`),
        publishedAt: article.extra?.date ?? null,
        excerpt,
        content,
        categories: article.extra?.tags ?? []
      };
    });
}

export async function fetchQwenResearchItems(input: {
  sourceId: string;
  sourceName: string;
  url: string;
}): Promise<RawItem[]> {
  const response = await fetch(input.url, {
    headers: {
      accept: "application/json,text/plain,*/*",
      referer: "https://qwen.ai/research",
      "user-agent": "ai-morning-brief/0.1"
    },
    next: { revalidate: 0 }
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} while fetching ${input.url}`);
  }

  const payload = await response.json();
  if (Array.isArray(payload)) {
    return parseQwenResearchItems({
      sourceId: input.sourceId,
      sourceName: input.sourceName,
      records: payload as QwenResearchRecord[]
    });
  }

  const articles = payload?.data?.articles;
  if (Array.isArray(articles)) {
    return parseQwenResearchArticles({
      sourceId: input.sourceId,
      sourceName: input.sourceName,
      articles: articles as QwenArticleRecord[]
    });
  }

  const records = payload?.data?.records;
  if (!Array.isArray(records)) return [];
  return parseQwenResearchItems({
    sourceId: input.sourceId,
    sourceName: input.sourceName,
    records
  });
}

function extractArticleText(html?: string): string {
  if (!html) return "";
  return cleanArticleText(html).slice(0, 20000);
}

function cleanArticleText(html: string): string {
  const $ = cheerio.load(html);
  $("script, style, noscript, svg, nav, footer, header").remove();
  const text = cleanText($("article").first().text() || $("main").first().text() || $("body").text());
  return text || cleanText(html.replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<script[\s\S]*?<\/script>/gi, " "));
}

function itemTime(value?: string): number {
  if (!value) return 0;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}
