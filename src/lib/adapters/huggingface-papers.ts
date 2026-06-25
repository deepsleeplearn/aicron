import * as cheerio from "cheerio";

import { huggingFacePaperListUrls } from "../huggingface-display";
import { canonicalizeUrl, cleanText } from "../normalization";
import type { RawItem } from "../types";

type FetchHuggingFacePapersInput = {
  sourceId: string;
  sourceName: string;
  url: string;
  maxItems?: number;
};

type PaperCandidate = {
  title: string;
  canonicalUrl: string;
  excerpt: string | null;
  paperId: string;
  sourceOrder: number;
  submittedAt: string | null;
};

const USER_AGENT = "ai-morning-brief/0.1";

export async function fetchHuggingFacePaperItems(input: FetchHuggingFacePapersInput): Promise<RawItem[]> {
  const candidates = await fetchHuggingFacePaperCandidates(input);

  const items = await Promise.all(
    candidates.map(async (candidate) => {
      const detail = await fetchHuggingFacePaperDetail(candidate.canonicalUrl).catch(() => null);
      const excerpt = detail?.summary || candidate.excerpt || candidate.title;
      const content = buildPaperContent({
        title: candidate.title,
        summary: detail?.summary || candidate.excerpt,
        authors: detail?.authors,
        organization: detail?.organization,
        paperId: detail?.paperId || candidate.paperId,
        submittedAt: detail?.submittedAt || candidate.submittedAt,
        publishedAt: detail?.publishedAt,
        arxivUrl: detail?.arxivUrl,
        githubUrl: detail?.githubUrl,
        upvotes: detail?.upvotes
      });

      return {
        sourceId: input.sourceId,
        sourceName: input.sourceName,
        title: detail?.title || candidate.title,
        canonicalUrl: candidate.canonicalUrl,
        publishedAt: detail?.publishedAt ?? null,
        submittedAt: detail?.submittedAt || candidate.submittedAt,
        sourceOrder: candidate.sourceOrder,
        excerpt,
        content,
        categories: [
          "paper",
          "research",
          "huggingface",
          detail?.githubUrl ? "github" : null,
          detail?.arxivUrl ? "arxiv" : null
        ].filter(Boolean) as string[]
      };
    })
  );

  return items;
}

async function fetchHuggingFacePaperCandidates(input: FetchHuggingFacePapersInput): Promise<PaperCandidate[]> {
  const candidates: PaperCandidate[] = [];
  const seen = new Set<string>();

  for (const url of huggingFacePaperListUrls({ sourceId: input.sourceId, url: input.url })) {
    const response = await fetch(url, {
      headers: { "user-agent": USER_AGENT },
      next: { revalidate: 0 }
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} while fetching ${url}`);
    }

    const html = await response.text();
    for (const candidate of extractHuggingFacePaperCandidates({
      html,
      baseUrl: url,
      maxItems: input.maxItems
    })) {
      if (seen.has(candidate.paperId)) continue;
      seen.add(candidate.paperId);
      candidates.push({ ...candidate, sourceOrder: candidates.length });
    }
  }

  return candidates;
}

export function extractHuggingFacePaperCandidates(input: {
  html: string;
  baseUrl: string;
  maxItems?: number;
}): PaperCandidate[] {
  const $ = cheerio.load(input.html);
  const seen = new Set<string>();
  const items: PaperCandidate[] = [];
  const pageSubmittedAt = extractPageSubmittedAt($);

  $("h3 a[href^='/papers/']").each((_, node) => {
    const href = $(node).attr("href");
    const title = cleanText($(node).text());
    const paperId = href?.match(/\/papers\/([^/?#]+)/)?.[1];
    if (!href || !paperId || !title || seen.has(paperId)) return;
    seen.add(paperId);

    const container = $(node).closest("article, li, div").parent();
    const excerpt = cleanText(container.find("p").first().text()) || null;

    items.push({
      title,
      paperId,
      canonicalUrl: canonicalizeUrl(new URL(href, input.baseUrl).toString()),
      excerpt,
      sourceOrder: items.length,
      submittedAt: pageSubmittedAt
    });
  });

  return items.slice(0, input.maxItems ?? 20);
}

async function fetchHuggingFacePaperDetail(url: string) {
  const response = await fetch(url, {
    headers: { "user-agent": USER_AGENT },
    next: { revalidate: 0 }
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} while fetching ${url}`);
  }

  return extractHuggingFacePaperDetail(await response.text(), url);
}

function extractHuggingFacePaperDetail(html: string, url: string) {
  const $ = cheerio.load(html);
  const title = cleanText($("h1").first().text()) || null;
  const paperId = url.match(/\/papers\/([^/?#]+)/)?.[1] ?? null;
  const pageText = cleanText($.text());
  const propsText = decodeHtmlEntities(html);
  const jsonText = decodeHtmlEntities(html.replace(/\\"/g, '"'));

  const summary =
    extractJsonString(propsText, "summary") ||
    extractJsonString(jsonText, "summary") ||
    cleanText($("h2")
      .filter((_, node) => cleanText($(node).text()) === "Abstract")
      .nextAll()
      .find("p")
      .first()
      .text()) ||
    null;

  const publishedAt =
    extractJsonString(propsText, "publishedAt") ||
    extractJsonString(jsonText, "publishedAt") ||
    parsePublishedDate(pageText);
  const submittedAt =
    extractJsonString(propsText, "submittedOnDailyAt") ||
    extractJsonString(jsonText, "submittedOnDailyAt");

  const authors = extractAuthorNames(propsText) || extractAuthorNames(jsonText);
  const organization = extractOrganization($);
  const arxivUrl = paperId ? `https://arxiv.org/abs/${paperId}` : extractLinkByHost($, "arxiv.org");
  const githubUrl = extractLinkByHost($, "github.com");
  const upvotes = pageText.match(/\bUpvote\s+([\d,]+)/i)?.[1] ?? null;

  return {
    title,
    paperId,
    summary,
    publishedAt,
    submittedAt,
    authors,
    organization,
    arxivUrl,
    githubUrl,
    upvotes
  };
}

function buildPaperContent(input: {
  title: string;
  summary?: string | null;
  authors?: string[] | null;
  organization?: string | null;
  paperId?: string | null;
  submittedAt?: string | null;
  publishedAt?: string | null;
  arxivUrl?: string | null;
  githubUrl?: string | null;
  upvotes?: string | null;
}) {
  return [
    input.summary || input.title,
    input.authors?.length ? `Authors: ${input.authors.slice(0, 12).join(", ")}` : null,
    input.organization ? `Organization: ${input.organization}` : null,
    input.paperId ? `Paper ID: ${input.paperId}` : null,
    input.submittedAt ? `Submitted: ${input.submittedAt}` : null,
    input.publishedAt ? `Published: ${input.publishedAt}` : null,
    input.upvotes ? `Hugging Face Upvotes: ${input.upvotes}` : null,
    input.arxivUrl ? `arXiv: ${input.arxivUrl}` : null,
    input.githubUrl ? `GitHub: ${input.githubUrl}` : null
  ]
    .filter(Boolean)
    .join("\n\n");
}

function extractPageSubmittedAt($: cheerio.CheerioAPI): string | null {
  const url =
    $("meta[property='og:url']").attr("content") ||
    $("link[rel='canonical']").attr("href") ||
    "";
  return url.match(/\/papers\/date\/(\d{4}-\d{2}-\d{2})/)?.[1] ?? null;
}

function extractJsonString(text: string, key: string): string | null {
  const match = text.match(new RegExp(`"${key}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`, "i"));
  return match?.[1] ? cleanText(decodeEscapedString(match[1])) : null;
}

function extractAuthorNames(text: string): string[] | null {
  const names = Array.from(text.matchAll(/"name"\s*:\s*"((?:\\.|[^"\\])+)"/g))
    .map((match) => cleanText(decodeEscapedString(match[1])))
    .filter((name) => name && !["user", "paper", "model", "dataset"].includes(name.toLowerCase()));
  const unique = Array.from(new Set(names));
  return unique.length > 0 ? unique.slice(0, 20) : null;
}

function extractOrganization($: cheerio.CheerioAPI): string | null {
  const organization = $("a[href^='/organizations/']").first().text();
  return cleanText(organization) || null;
}

function extractLinkByHost($: cheerio.CheerioAPI, hostname: string): string | null {
  const href = $(`a[href*='${hostname}']`).first().attr("href");
  if (!href) return null;
  try {
    return canonicalizeUrl(href);
  } catch {
    return null;
  }
}

function parsePublishedDate(text: string): string | null {
  const dateText = text.match(/Published on\s+([A-Z][a-z]{2,8}\s+\d{1,2},\s+\d{4})/)?.[1];
  return dateText ?? null;
}

function decodeEscapedString(text: string): string {
  return text
    .replace(/\\u([\dA-Fa-f]{4})/g, (_, code) => String.fromCharCode(Number.parseInt(code, 16)))
    .replace(/\\n/g, " ")
    .replace(/\\"/g, '"')
    .replace(/\\\//g, "/");
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}
