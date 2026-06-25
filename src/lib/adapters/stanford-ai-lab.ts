import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";

import { canonicalizeUrl, cleanText } from "../normalization";
import type { RawItem } from "../types";

type StanfordAiLabCategory = {
  label: string;
  path: string;
};

const STANFORD_AI_LAB_CATEGORIES: StanfordAiLabCategory[] = [
  { label: "Conferences", path: "/blog/conferences" },
  { label: "Computer Vision", path: "/blog/vision" },
  { label: "Robotics", path: "/blog/robotics" },
  { label: "NLP", path: "/blog/nlp" },
  { label: "Machine Learning", path: "/blog/ml" },
  { label: "Reinforcement Learning", path: "/blog/rl" }
];

type ExtractStanfordAiLabBlogItemsInput = {
  sourceId: string;
  sourceName: string;
  baseUrl: string;
  html: string;
  categories?: Map<string, string[]>;
};

export function extractStanfordAiLabBlogItems(input: ExtractStanfordAiLabBlogItemsInput): RawItem[] {
  const $ = cheerio.load(input.html);
  const seen = new Set<string>();
  const items: RawItem[] = [];

  $(".posts .post-teaser").each((_, node) => {
    const link = $(node).find("a.post-link[href]").first();
    const href = link.attr("href");
    const title = cleanText(link.find("h1, h2, h3").first().text() || link.text());
    if (!href || !title) return;

    const canonicalUrl = canonicalizeUrl(new URL(href, input.baseUrl).toString());
    if (seen.has(canonicalUrl)) return;
    seen.add(canonicalUrl);

    const excerpt = extractStanfordExcerpt($, node) ?? title;
    const labels = mergeStanfordLabels(input.categories?.get(canonicalUrl) ?? [], `${title} ${excerpt}`);
    items.push({
      sourceId: input.sourceId,
      sourceName: input.sourceName,
      title,
      canonicalUrl,
      publishedAt: extractStanfordPublishedAt($, node),
      excerpt,
      categories: ["Stanford AI Lab", ...labels]
    });
  });

  return items.sort(compareNewestFirst);
}

export async function fetchStanfordAiLabBlogItems(input: {
  sourceId: string;
  sourceName: string;
  url: string;
  maxItems?: number;
}): Promise<RawItem[]> {
  const [html, categories] = await Promise.all([
    fetchStanfordText(input.url),
    fetchStanfordCategoryMap(input.url)
  ]);
  const items = extractStanfordAiLabBlogItems({
    sourceId: input.sourceId,
    sourceName: input.sourceName,
    baseUrl: input.url,
    html,
    categories
  });
  return typeof input.maxItems === "number" ? items.slice(0, input.maxItems) : items;
}

async function fetchStanfordCategoryMap(baseUrl: string): Promise<Map<string, string[]>> {
  const entries = await Promise.all(
    STANFORD_AI_LAB_CATEGORIES.map(async (category) => {
      try {
        const html = await fetchStanfordText(new URL(category.path, baseUrl).toString());
        return extractCategoryUrls({
          baseUrl,
          html,
          label: category.label
        });
      } catch {
        return [];
      }
    })
  );

  const map = new Map<string, string[]>();
  for (const entry of entries.flat()) {
    const labels = map.get(entry.canonicalUrl) ?? [];
    if (!labels.includes(entry.label)) labels.push(entry.label);
    map.set(entry.canonicalUrl, labels);
  }
  return map;
}

function extractCategoryUrls(input: {
  baseUrl: string;
  html: string;
  label: string;
}): Array<{ canonicalUrl: string; label: string }> {
  const $ = cheerio.load(input.html);
  const seen = new Set<string>();
  const urls: Array<{ canonicalUrl: string; label: string }> = [];

  $(".posts .post-teaser a.post-link[href], a.post-link[href]").each((_, node) => {
    const href = $(node).attr("href");
    if (!href) return;
    const canonicalUrl = canonicalizeUrl(new URL(href, input.baseUrl).toString());
    if (seen.has(canonicalUrl)) return;
    seen.add(canonicalUrl);
    urls.push({ canonicalUrl, label: input.label });
  });

  return urls;
}

async function fetchStanfordText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { "user-agent": "ai-morning-brief/0.1" },
    next: { revalidate: 0 }
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} while fetching ${url}`);
  }
  return response.text();
}

function extractStanfordPublishedAt($: cheerio.CheerioAPI, node: AnyNode): string | null {
  const html = $(node).html() ?? "";
  return html.match(/<!--\s*([A-Z][a-z]+ \d{1,2}, \d{4})\s*-->/)?.[1] ?? null;
}

function extractStanfordExcerpt($: cheerio.CheerioAPI, node: AnyNode): string | null {
  const excerpt = cleanText($(node).find(".excerpt-text").first().text());
  return excerpt || null;
}

function mergeStanfordLabels(existing: string[], text: string): string[] {
  const labels = new Set(existing);
  const normalized = text.toLowerCase();

  if (/\b(cvpr|iclr|neurips|corl|acl|emnlp|naacl|icml)\b|conference|papers and talks/i.test(text)) {
    labels.add("Conferences");
  }
  if (/computer vision|vision-language|visual|video|image|multimodal|spatial|3d/.test(normalized)) {
    labels.add("Computer Vision");
  }
  if (/robot|robotic|embodied|manipulation|navigation/.test(normalized)) {
    labels.add("Robotics");
  }
  if (/\bnlp\b|language|llm|speech|spoken|text|in-context|verbatim|memorization|listen/.test(normalized)) {
    labels.add("NLP");
  }
  if (/reinforcement|reward|policy|world model|world models|\brl\b/.test(normalized)) {
    labels.add("Reinforcement Learning");
  }
  if (/model|learning|foundation|training|benchmark|neural|algorithm|data|ai/.test(normalized)) {
    labels.add("Machine Learning");
  }
  if (labels.size === 0) labels.add("Machine Learning");

  return STANFORD_AI_LAB_CATEGORIES
    .map((category) => category.label)
    .filter((label) => labels.has(label));
}

function compareNewestFirst(a: RawItem, b: RawItem): number {
  const left = a.publishedAt ? Date.parse(a.publishedAt) : 0;
  const right = b.publishedAt ? Date.parse(b.publishedAt) : 0;
  return right - left;
}
