import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";
import Parser from "rss-parser";

import { canonicalizeUrl, cleanText } from "../normalization";
import { normalizeRssItems } from "./rss";
import type { RawItem } from "../types";

type BaseExtractionInput = {
  sourceId: string;
  sourceName: string;
  baseUrl: string;
  html: string;
};

type AcademicTocExtractionInput = BaseExtractionInput & {
  categories?: string[];
};

const USER_AGENT = "Mozilla/5.0 (compatible; ai-morning-brief/0.1)";
const rssParser = new Parser();

export function extractOptimizationOnlineItems(input: BaseExtractionInput): RawItem[] {
  const $ = cheerio.load(input.html);
  const items: RawItem[] = [];
  const seen = new Set<string>();

  $("li").each((_, node) => {
    const text = cleanText($(node).text());
    if (!/\bPublished\s+\d{4}\/\d{2}\/\d{2}\s+by\b/i.test(text)) return;

    const link = $(node).find("a[href]").first();
    const href = link.attr("href");
    const title = cleanText(link.text());
    if (!href || !title) return;

    const canonicalUrl = canonicalizeUrl(new URL(href, input.baseUrl).toString());
    if (seen.has(canonicalUrl)) return;
    seen.add(canonicalUrl);

    const publishedAt = text.match(/\bPublished\s+(\d{4}\/\d{2}\/\d{2})\b/i)?.[1] ?? null;
    const authors = cleanText(text.match(/\bby\s+(.+)$/i)?.[1] ?? "");

    items.push({
      sourceId: input.sourceId,
      sourceName: input.sourceName,
      title,
      canonicalUrl,
      publishedAt,
      excerpt: authors || title,
      content: buildContent({
        abstract: title,
        authors,
        link: canonicalUrl
      }),
      categories: ["Optimization", "Optimization Online"]
    });
  });

  return items;
}

export async function extractOptimizationOnlineRssItems(input: BaseExtractionInput): Promise<RawItem[]> {
  const feed = await rssParser.parseString(input.html);
  return enrichMathRssItems({
    sourceId: input.sourceId,
    sourceName: input.sourceName,
    baseUrl: input.baseUrl,
    defaults: ["Optimization", "Optimization Online"],
    items: feed.items
  });
}

export function extractPmlrProceedingItems(input: BaseExtractionInput): RawItem[] {
  const $ = cheerio.load(input.html);
  const volumeTitle = cleanText($("h1, h2").first().text());
  const publishedAt = volumeTitle.match(/\b(20\d{2}|19\d{2})\b/)?.[1] ?? null;
  const sourceCategories = pmlrCategories(input.sourceName, volumeTitle);
  const items: RawItem[] = [];
  const seen = new Set<string>();

  $(".paper, article").each((_, node) => {
    const title = cleanText($(node).find(".title, h3, h2").first().text());
    const absLink = findLinkByText($, node, /^abs$/i) ?? $(node).find("a[href]").first();
    const href = absLink.attr("href");
    if (!title || !href) return;

    const canonicalUrl = canonicalizeUrl(new URL(href, input.baseUrl).toString());
    if (seen.has(canonicalUrl)) return;
    seen.add(canonicalUrl);

    const details = cleanText($(node).find(".details").first().text());
    const pdfLink = findLinkByText($, node, /pdf/i)?.attr("href");
    const pdfUrl = pdfLink ? canonicalizeUrl(new URL(pdfLink, input.baseUrl).toString()) : null;

    items.push({
      sourceId: input.sourceId,
      sourceName: input.sourceName,
      title,
      canonicalUrl,
      publishedAt,
      excerpt: details || title,
      content: buildContent({
        abstract: title,
        authors: details.split(";")[0] ?? "",
        venue: volumeTitle,
        link: canonicalUrl,
        pdfUrl
      }),
      categories: mergeCategories(sourceCategories, inferMathTags(`${title} ${details}`))
    });
  });

  return items;
}

export function extractJmlrPaperItems(input: BaseExtractionInput): RawItem[] {
  const $ = cheerio.load(input.html);
  const items: RawItem[] = [];
  const seen = new Set<string>();

  $("dt").each((_, node) => {
    const title = cleanText($(node).text());
    const detailsNode = $(node).next("dd");
    const absLink = findLinkByText($, detailsNode.get(0), /^abs$/i) ?? detailsNode.find("a[href]").first();
    const href = absLink.attr("href");
    if (!title || !href) return;

    const canonicalUrl = canonicalizeUrl(new URL(href, input.baseUrl).toString());
    if (seen.has(canonicalUrl)) return;
    seen.add(canonicalUrl);

    const details = cleanText(detailsNode.text());
    const pdfLink = findLinkByText($, detailsNode.get(0), /pdf/i)?.attr("href");
    const pdfUrl = pdfLink ? canonicalizeUrl(new URL(pdfLink, input.baseUrl).toString()) : null;

    items.push({
      sourceId: input.sourceId,
      sourceName: input.sourceName,
      title,
      canonicalUrl,
      publishedAt: details.match(/\b(20\d{2}|19\d{2})\b/)?.[1] ?? null,
      excerpt: details || title,
      content: buildContent({
        abstract: title,
        authors: details.split(";")[0] ?? "",
        link: canonicalUrl,
        pdfUrl
      }),
      categories: mergeCategories(["JMLR", "Machine Learning"], inferMathTags(`${title} ${details}`))
    });
  });

  return items;
}

export function extractAcademicTocItems(input: AcademicTocExtractionInput): RawItem[] {
  const $ = cheerio.load(input.html);
  const items: RawItem[] = [];
  const seen = new Set<string>();

  $("article, .issue-item, .toc-item, .hlFld-Title, .c-card, .app-card-open, .app-card, li")
    .find("h2 a[href], h3 a[href], h4 a[href], h5 a[href]")
    .add("main h2 a[href], main h3 a[href], main h4 a[href], main h5 a[href]")
    .each((_, linkNode) => {
    const link = $(linkNode);
    const href = link.attr("href");
    const title = cleanText(link.text());
    if (!href || !isLikelyAcademicArticleLink(title, href)) return;

    const canonicalUrl = canonicalizeUrl(new URL(href, input.baseUrl).toString());
    if (seen.has(canonicalUrl)) return;
    seen.add(canonicalUrl);

    const container = link.closest("article, .issue-item, .toc-item, .c-card, .app-card-open, .app-card, li, div");
    const text = cleanText(container.text());
    const authors = cleanText(container.find(".authors, [class*='author'], [class*='Author'], .c-article-author-list").first().text());
    const abstract =
      cleanText(container.find(".abstract, [class*='abstract'], [class*='Abstract']").first().text()) ||
      cleanText(container.find("p").first().text());
    const publishedAt = extractPublishedDate(text);

    items.push({
      sourceId: input.sourceId,
      sourceName: input.sourceName,
      title,
      canonicalUrl,
      publishedAt,
      excerpt: abstract || authors || title,
      content: buildContent({
        abstract: abstract || title,
        authors,
        link: canonicalUrl
      }),
      categories: mergeCategories(input.categories ?? academicCategoriesForSource(input.sourceId), inferMathTags(`${title} ${abstract}`))
    });
  });

  return items;
}

export async function extractAcademicTocRssItems(input: AcademicTocExtractionInput): Promise<RawItem[]> {
  const feed = await rssParser.parseString(input.html);
  return enrichMathRssItems({
    sourceId: input.sourceId,
    sourceName: input.sourceName,
    baseUrl: input.baseUrl,
    defaults: input.categories ?? academicCategoriesForSource(input.sourceId),
    items: feed.items
  });
}

export async function fetchOptimizationOnlineItems(input: {
  sourceId: string;
  sourceName: string;
  url: string;
  maxItems?: number;
}): Promise<RawItem[]> {
  const feedUrl = input.url.includes("/feed/") ? input.url : new URL("/feed/", input.url).toString();
  const html = await fetchHtml(feedUrl);
  const items = isRssDocument(html) ? await extractOptimizationOnlineRssItems({
    sourceId: input.sourceId,
    sourceName: input.sourceName,
    baseUrl: feedUrl,
    html
  }) : extractOptimizationOnlineItems({
    sourceId: input.sourceId,
    sourceName: input.sourceName,
    baseUrl: input.url,
    html
  });
  return limitItems(items, input.maxItems);
}

export async function fetchPmlrProceedingItems(input: {
  sourceId: string;
  sourceName: string;
  url: string;
  maxItems?: number;
}): Promise<RawItem[]> {
  const items = extractPmlrProceedingItems({
    sourceId: input.sourceId,
    sourceName: input.sourceName,
    baseUrl: input.url,
    html: await fetchHtml(input.url)
  });
  return limitItems(items, input.maxItems);
}

export async function fetchJmlrPaperItems(input: {
  sourceId: string;
  sourceName: string;
  url: string;
  maxItems?: number;
}): Promise<RawItem[]> {
  const items = extractJmlrPaperItems({
    sourceId: input.sourceId,
    sourceName: input.sourceName,
    baseUrl: input.url,
    html: await fetchHtml(input.url)
  });
  return limitItems(items, input.maxItems);
}

export async function fetchAcademicTocItems(input: {
  sourceId: string;
  sourceName: string;
  url: string;
  maxItems?: number;
}): Promise<RawItem[]> {
  const html = await fetchHtml(input.url);
  const extractionInput = {
    sourceId: input.sourceId,
    sourceName: input.sourceName,
    baseUrl: input.url,
    html
  };
  const items = isRssDocument(html)
    ? await extractAcademicTocRssItems(extractionInput)
    : extractAcademicTocItems(extractionInput);
  return limitItems(items, input.maxItems);
}

async function fetchHtml(url: string): Promise<string> {
  const cookies = new Map<string, string>();
  let currentUrl = url;
  let response: Response | null = null;

  for (let redirects = 0; redirects < 8; redirects += 1) {
    response = await fetch(currentUrl, {
      headers: {
        "accept": "application/rss+xml, application/xml, text/html;q=0.9, */*;q=0.8",
        "cookie": Array.from(cookies.values()).join("; "),
        "user-agent": USER_AGENT
      },
      redirect: "manual",
      next: { revalidate: 0 }
    });

    mergeResponseCookies(response, cookies);
    const location = response.headers.get("location");
    if (!isRedirectResponse(response.status) || !location) break;
    currentUrl = new URL(location, currentUrl).toString();
  }

  if (!response) throw new Error(`No response while fetching ${url}`);
  if (!response.ok) throw new Error(`HTTP ${response.status} while fetching ${url}`);
  return response.text();
}

function isRedirectResponse(status: number): boolean {
  return status >= 300 && status < 400;
}

function mergeResponseCookies(response: Response, cookies: Map<string, string>) {
  const headers = response.headers as Headers & { getSetCookie?: () => string[] };
  const setCookieHeaders = headers.getSetCookie?.() ?? splitSetCookieHeader(response.headers.get("set-cookie"));
  for (const setCookie of setCookieHeaders) {
    const pair = setCookie.split(";")[0]?.trim();
    if (!pair) continue;
    const name = pair.split("=")[0];
    if (name) cookies.set(name, pair);
  }
}

function splitSetCookieHeader(value: string | null): string[] {
  if (!value) return [];
  return value.split(/,(?=\s*[^;,=\s]+=[^;,]*)/g);
}

function isRssDocument(html: string): boolean {
  return /<(rss|rdf:RDF|feed)\b/i.test(html.slice(0, 500));
}

function enrichMathRssItems(input: {
  sourceId: string;
  sourceName: string;
  baseUrl: string;
  defaults: string[];
  items: Array<Record<string, unknown>>;
}): RawItem[] {
  return normalizeRssItems({
    sourceId: input.sourceId,
    sourceName: input.sourceName,
    url: input.baseUrl,
    items: input.items
  }).map((item) => ({
    ...item,
    categories: mergeCategories(
      input.defaults,
      item.categories ?? [],
      inferMathTags(`${item.title} ${item.excerpt ?? ""} ${item.content ?? ""}`)
    )
  }));
}

function findLinkByText(
  $: cheerio.CheerioAPI,
  node: AnyNode | undefined,
  pattern: RegExp
): cheerio.Cheerio<AnyNode> {
  if (!node) return cheerio.load("")("a[href]");
  const links = $(node).find("a[href]").toArray();
  const match = links.find((link) => pattern.test(cleanText($(link).text())));
  return match ? $(match) : cheerio.load("")("a[href]");
}

function buildContent(input: {
  abstract: string;
  authors?: string;
  venue?: string;
  link: string;
  pdfUrl?: string | null;
}): string {
  return [
    input.abstract,
    input.authors ? `Authors: ${input.authors}` : null,
    input.venue ? `Venue: ${input.venue}` : null,
    `Link: ${input.link}`,
    input.pdfUrl ? `PDF: ${input.pdfUrl}` : null
  ]
    .filter(Boolean)
    .join("\n");
}

function pmlrCategories(sourceName: string, volumeTitle: string): string[] {
  const text = `${sourceName} ${volumeTitle}`;
  if (/\bCOLT\b|Learning Theory/i.test(text)) return ["PMLR", "COLT", "Learning Theory"];
  if (/\bALT\b|Algorithmic Learning Theory/i.test(text)) return ["PMLR", "ALT", "Learning Theory"];
  if (/\bAISTATS\b|Artificial Intelligence and Statistics/i.test(text)) return ["PMLR", "AISTATS", "Statistics"];
  if (/\bUAI\b|Uncertainty in Artificial Intelligence/i.test(text)) return ["PMLR", "UAI", "Statistics"];
  return ["PMLR"];
}

function academicCategoriesForSource(sourceId: string): string[] {
  if (sourceId === "siam-optimization") return ["SIAM", "Optimization"];
  if (sourceId === "informs-mor") return ["INFORMS", "Operations Research", "Optimization"];
  if (sourceId === "mathprog-journal") return ["MOS", "Mathematical Programming", "Optimization"];
  if (sourceId === "statistics-computing") return ["Statistics", "Computational Statistics"];
  if (sourceId === "siam-sisc") return ["SIAM", "Scientific Computing", "Applied Math"];
  if (sourceId === "siam-sinum") return ["SIAM", "Numerical Analysis", "Applied Math"];
  if (sourceId === "siam-mds") return ["SIAM", "Mathematics of Data Science", "Applied Math"];
  return [];
}

function inferMathTags(text: string): string[] {
  const tags: string[] = [];
  addTag(tags, "Optimization", /\boptimi[sz]ation|gradient|convex|nonconvex|quasi-newton|proximal|bandit convex/i, text);
  addTag(tags, "Statistics", /\bstatistic|bayesian|inference|estimation|causal|distribution|probability/i, text);
  addTag(tags, "Learning Theory", /\blearning theory|PAC|regret|bandit|online learning|generalization/i, text);
  addTag(tags, "Numerical Analysis", /\bnumerical|finite element|eigenvalue|matrix computation|PDE|scientific computing/i, text);
  return tags;
}

function addTag(tags: string[], tag: string, pattern: RegExp, text: string) {
  if (pattern.test(text) && !tags.includes(tag)) tags.push(tag);
}

function mergeCategories(...groups: string[][]): string[] {
  return Array.from(new Set(groups.flat().filter(Boolean)));
}

function extractPublishedDate(text: string): string | null {
  return (
    text.match(/\bPublished:\s*(\d{1,2} [A-Z][a-z]+ \d{4})\b/)?.[1] ??
    text.match(/\bPublished Online:\s*([A-Z][a-z]+ \d{1,2}, \d{4})\b/)?.[1] ??
    text.match(/\b([A-Z][a-z]+ \d{1,2}, \d{4})\b/)?.[1] ??
    text.match(/\b(\d{1,2} [A-Z][a-z]+ \d{4})\b/)?.[1] ??
    text.match(/\b(20\d{2}|19\d{2})\b/)?.[1] ??
    null
  );
}

function isLikelyAcademicArticleLink(title: string, href: string): boolean {
  if (title.length < 8) return false;
  if (/^(Issue|Volume|Journal updates?|About this journal|Search|Submit manuscript|Editorial board)\b/i.test(title)) {
    return false;
  }
  if (/\b(issues?|volumes?|updates?|aims-and-scope|submission-guidelines)\b/i.test(href)) return false;
  return (
    /\/doi\//i.test(href) ||
    /\/article\//i.test(href) ||
    /\/chapter\//i.test(href) ||
    /10\.\d{4,9}\//.test(href)
  );
}

function limitItems(items: RawItem[], maxItems?: number): RawItem[] {
  return typeof maxItems === "number" ? items.slice(0, maxItems) : items;
}
