import * as cheerio from "cheerio";

import { fetchArticleContent } from "./content";
import { richContentToText } from "./rich-content";
import type { StoredItem } from "./types";

type WebSearchResult = {
  title: string;
  url: string;
  snippet: string;
};

const WEB_SEARCH_TIMEOUT_MS = 9000;
const MAX_SEARCH_RESULTS = 3;
const MAX_FETCHED_RESULT_CHARS = 4500;

export async function collectWebSearchContext(input: { item: StoredItem; prompt: string }): Promise<string | null> {
  const sections: string[] = [];

  const original = await fetchArticleContent(input.item.canonicalUrl).catch(() => null);
  if (original) {
    sections.push(formatWebContextSection("原网址正文", input.item.canonicalUrl, richContentToText(original).slice(0, 8000)));
  }

  const results = await searchWeb(`${input.item.title} ${input.prompt}`.slice(0, 260)).catch(() => []);
  const usableResults = results.filter((result) => result.url !== input.item.canonicalUrl).slice(0, MAX_SEARCH_RESULTS);

  for (const result of usableResults) {
    const fetched = await fetchArticleContent(result.url).catch(() => null);
    const body = richContentToText(fetched ?? result.snippet).slice(0, MAX_FETCHED_RESULT_CHARS);
    if (!body) continue;
    sections.push(formatWebContextSection(result.title || "联网搜索结果", result.url, body));
  }

  return sections.length > 0 ? sections.join("\n\n") : null;
}

async function searchWeb(query: string): Promise<WebSearchResult[]> {
  const searchUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const response = await fetchWithTimeout(searchUrl, WEB_SEARCH_TIMEOUT_MS, {
    headers: {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "en-US,en;q=0.9",
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
    }
  });
  if (!response.ok) return [];

  const html = await response.text();
  const $ = cheerio.load(html);
  const results: WebSearchResult[] = [];
  $(".result").each((_, element) => {
    const root = $(element);
    const link = root.find(".result__a").first();
    const rawUrl = link.attr("href") ?? "";
    const url = normalizeDuckDuckGoUrl(rawUrl);
    if (!url) return;
    results.push({
      title: link.text().trim(),
      url,
      snippet: root.find(".result__snippet").text().trim()
    });
  });

  return results;
}

async function fetchWithTimeout(url: string, timeoutMs: number, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function normalizeDuckDuckGoUrl(rawUrl: string): string | null {
  if (!rawUrl) return null;
  try {
    const parsed = new URL(rawUrl, "https://duckduckgo.com");
    const redirected = parsed.searchParams.get("uddg");
    const target = new URL(redirected ?? parsed.href);
    return ["http:", "https:"].includes(target.protocol) ? target.href : null;
  } catch {
    return null;
  }
}

function formatWebContextSection(title: string, url: string, content: string): string {
  return [`### ${title}`, `URL: ${url}`, content].join("\n");
}
