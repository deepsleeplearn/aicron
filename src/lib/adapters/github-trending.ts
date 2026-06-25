import * as cheerio from "cheerio";

import { canonicalizeUrl, cleanText } from "../normalization";
import type { RawItem } from "../types";

type ExtractGithubTrendingItemsInput = {
  sourceId: string;
  sourceName: string;
  baseUrl: string;
  html: string;
};

export function extractGithubTrendingItems(input: ExtractGithubTrendingItemsInput): RawItem[] {
  const $ = cheerio.load(input.html);
  const publishedAt = new Date().toISOString();
  const items: RawItem[] = [];

  for (const node of $("article.Box-row").toArray()) {
    const repoAnchor = $(node).find("h2 a").first();
    const href = repoAnchor.attr("href");
    const name = cleanText(repoAnchor.text()).replace(/\s*\/\s*/g, "/");
    if (!href || !name.includes("/")) continue;

    const canonicalUrl = canonicalizeUrl(new URL(href, input.baseUrl).toString());
    const description = cleanText($(node).find("p").first().text());
    const language = cleanText($(node).find("[itemprop='programmingLanguage']").first().text());
    const stars = cleanText($(node).find(`a[href='${href}/stargazers']`).first().text());
    const forks = cleanText($(node).find(`a[href='${href}/forks']`).first().text());
    const todayStars = cleanText($(node).find("span.d-inline-block.float-sm-right").first().text());
    const details = [
      description,
      language ? `语言：${language}` : null,
      stars ? `Stars：${stars}` : null,
      forks ? `Forks：${forks}` : null,
      todayStars || null
    ].filter(Boolean);

    items.push({
      sourceId: input.sourceId,
      sourceName: input.sourceName,
      title: name,
      canonicalUrl,
      publishedAt,
      excerpt: details.join(" · ") || name,
      content: [
        description || "GitHub Trending 当前热榜项目。",
        language ? `主要语言：${language}` : null,
        stars ? `总 Star：${stars}` : null,
        forks ? `Fork：${forks}` : null,
        todayStars || null,
        `项目地址：${canonicalUrl}`
      ]
        .filter(Boolean)
        .join("\n\n"),
      categories: ["github-trending", language].filter(Boolean)
    });
  }

  return items.slice(0, 25);
}

export async function fetchGithubTrendingItems(input: {
  sourceId: string;
  sourceName: string;
  url: string;
}): Promise<RawItem[]> {
  const response = await fetch(input.url, {
    headers: { "user-agent": "ai-morning-brief/0.1" },
    next: { revalidate: 0 }
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} while fetching ${input.url}`);
  }
  const html = await response.text();
  return extractGithubTrendingItems({
    sourceId: input.sourceId,
    sourceName: input.sourceName,
    baseUrl: input.url,
    html
  });
}
