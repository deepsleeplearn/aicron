import { fetchBairBlogItems } from "./adapters/bair-blog";
import { fetchArxivPaperItems } from "./adapters/arxiv-papers";
import { fetchClaudeBlogItems } from "./adapters/claude-blog";
import { fetchCodexRadarItems } from "./adapters/codex-radar";
import { fetchCmuMlBlogItems } from "./adapters/cmu-ml-blog";
import { fetchGithubTrendingItems } from "./adapters/github-trending";
import { fetchHtmlListItems } from "./adapters/html-list";
import { fetchHuggingFacePaperItems } from "./adapters/huggingface-papers";
import { fetchKimiBlogItems } from "./adapters/kimi-blog";
import { fetchMarkdownChangelogItems } from "./adapters/markdown-changelog";
import {
  fetchAcademicTocItems,
  fetchJmlrPaperItems,
  fetchOptimizationOnlineItems,
  fetchPmlrProceedingItems
} from "./adapters/math-publications";
import { fetchMilaBlogItems } from "./adapters/mila-blog";
import {
  fetchOpenAICodexChangelogItems,
  fetchOpenAIDevelopersBlogItems
} from "./adapters/openai-developers";
import { fetchOpenReviewPaperItems } from "./adapters/openreview-papers";
import { fetchQwenResearchItems } from "./adapters/qwen-research";
import { fetchRssItems } from "./adapters/rss";
import { fetchStanfordAiLabBlogItems } from "./adapters/stanford-ai-lab";
import { fetchTwitterUserPostItems } from "./adapters/twitter-user-posts";
import { fetchVectorPublicationItems } from "./adapters/vector-publications";
import { fetchZhipuModelFamilyItems } from "./adapters/zhipu-model-family";
import { mapWithConcurrency } from "./concurrency";
import { fetchArticleContent } from "./content";
import { recordFetchRun, removeSourceItemsExcept, upsertItem } from "./db";
import { computeItemHash, makeExtractiveSummary, rankItem } from "./normalization";
import type { FetchHealth, RawItem, Source } from "./types";

const DEFAULT_SOURCE_FETCH_CONCURRENCY = 4;
const DEFAULT_CONTENT_FETCH_CONCURRENCY = 4;

type SourceFetchResult = {
  source: Source;
  started: number;
  rawItems: RawItem[];
  error?: unknown;
};

export async function fetchSource(source: Source): Promise<FetchHealth> {
  const started = Date.now();
  try {
    const rawItems = await fetchRawItems(source);
    return persistFetchedSource({ source, started, rawItems });
  } catch (error) {
    return recordSourceError(source, started, error);
  }
}

export async function refreshSources(sources: Source[]): Promise<FetchHealth[]> {
  const enabledSources = sources.filter((source) => source.enabled);
  const fetchedSources = await mapWithConcurrency(
    enabledSources,
    getSourceFetchConcurrency(),
    fetchSourceRaw
  );

  return fetchedSources.map((result) => {
    if (result.error) return recordSourceError(result.source, result.started, result.error);
    return persistFetchedSource(result);
  });
}

async function fetchSourceRaw(source: Source): Promise<SourceFetchResult> {
  const started = Date.now();
  try {
    return {
      source,
      started,
      rawItems: await fetchRawItems(source)
    };
  } catch (error) {
    return {
      source,
      started,
      rawItems: [],
      error
    };
  }
}

function persistFetchedSource(input: SourceFetchResult): FetchHealth {
  const { source, started, rawItems } = input;
  try {
    for (const raw of rawItems) {
      persistRawItem(source, raw);
    }
    if (shouldPruneMissingSourceItems(source)) {
      removeSourceItemsExcept(
        source.id,
        rawItems.map((item) => item.canonicalUrl)
      );
    }
    const result = {
      sourceId: source.id,
      status: "ok" as const,
      fetchedCount: rawItems.length,
      durationMs: Date.now() - started
    };
    recordFetchRun(result);
    return result;
  } catch (error) {
    return recordSourceError(source, started, error);
  }
}

function recordSourceError(source: Source, started: number, error: unknown): FetchHealth {
  const result = {
    sourceId: source.id,
    status: "error" as const,
    fetchedCount: 0,
    durationMs: Date.now() - started,
    message: error instanceof Error ? error.message : String(error)
  };
  recordFetchRun(result);
  return result;
}

function shouldPruneMissingSourceItems(source: Source): boolean {
  return (
    source.type === "zhipu-model-family" ||
    source.type === "bair-blog" ||
    source.type === "cmu-ml-blog" ||
    source.type === "mila-blog" ||
    source.type === "openai-developers-blog" ||
    source.type === "openai-codex-changelog" ||
    source.type === "claude-blog" ||
    source.type === "kimi-blog" ||
    source.type === "stanford-ai-lab-blog" ||
    source.type === "huggingface-papers" ||
    source.type === "arxiv-papers" ||
    source.type === "openreview-papers" ||
    source.type === "optimization-online" ||
    source.type === "jmlr-papers" ||
    source.type === "pmlr-proceedings" ||
    source.type === "academic-toc" ||
    source.type === "vector-publications" ||
    source.type === "twitter-user-posts" ||
    source.type === "codex-radar" ||
    source.id === "openai-research-index"
  );
}

async function fetchRawItems(source: Source): Promise<RawItem[]> {
  let items: RawItem[];
  if (source.type === "rss") {
    items = await fetchRssItems({ sourceId: source.id, sourceName: source.name, url: source.url });
    const filteredItems = filterRawItems(source, items);
    return shouldHydrateFullArticleContent(source) ? hydrateRawItemContent(filteredItems) : filteredItems;
  }
  if (source.type === "bair-blog") {
    items = await fetchBairBlogItems({
      sourceId: source.id,
      sourceName: source.name,
      url: source.url,
      maxItems: source.maxItems
    });
    return filterRawItems(source, items);
  }
  if (source.type === "cmu-ml-blog") {
    items = await fetchCmuMlBlogItems({
      sourceId: source.id,
      sourceName: source.name,
      url: source.url,
      maxItems: source.maxItems
    });
    return filterRawItems(source, items);
  }
  if (source.type === "mila-blog") {
    items = await fetchMilaBlogItems({
      sourceId: source.id,
      sourceName: source.name,
      url: source.url,
      maxItems: source.maxItems
    });
    return filterRawItems(source, items);
  }
  if (source.type === "html-list") {
    items = await fetchHtmlListItems({
      sourceId: source.id,
      sourceName: source.name,
      url: source.url,
      includePathPrefixes: source.includePathPrefixes,
      includeHostnames: source.includeHostnames
    });
    return filterRawItems(source, items);
  }
  if (source.type === "github-trending") {
    items = await fetchGithubTrendingItems({
      sourceId: source.id,
      sourceName: source.name,
      url: source.url
    });
    return filterRawItems(source, items);
  }
  if (source.type === "huggingface-papers") {
    items = await fetchHuggingFacePaperItems({
      sourceId: source.id,
      sourceName: source.name,
      url: source.url,
      maxItems: source.maxItems
    });
    return filterRawItems(source, items);
  }
  if (source.type === "arxiv-papers") {
    items = await fetchArxivPaperItems({
      sourceId: source.id,
      sourceName: source.name,
      url: source.url,
      maxItems: source.maxItems
    });
    return filterRawItems(source, items);
  }
  if (source.type === "openreview-papers") {
    items = await fetchOpenReviewPaperItems({
      sourceId: source.id,
      sourceName: source.name,
      url: source.url,
      maxItems: source.maxItems
    });
    return filterRawItems(source, items);
  }
  if (source.type === "optimization-online") {
    items = await fetchOptimizationOnlineItems({
      sourceId: source.id,
      sourceName: source.name,
      url: source.url,
      maxItems: source.maxItems
    });
    return filterRawItems(source, items);
  }
  if (source.type === "jmlr-papers") {
    items = await fetchJmlrPaperItems({
      sourceId: source.id,
      sourceName: source.name,
      url: source.url,
      maxItems: source.maxItems
    });
    return filterRawItems(source, items);
  }
  if (source.type === "pmlr-proceedings") {
    items = await fetchPmlrProceedingItems({
      sourceId: source.id,
      sourceName: source.name,
      url: source.url,
      maxItems: source.maxItems
    });
    return filterRawItems(source, items);
  }
  if (source.type === "academic-toc") {
    items = await fetchAcademicTocItems({
      sourceId: source.id,
      sourceName: source.name,
      url: source.url,
      maxItems: source.maxItems
    });
    return filterRawItems(source, items);
  }
  if (source.type === "openai-developers-blog") {
    items = await fetchOpenAIDevelopersBlogItems({
      sourceId: source.id,
      sourceName: source.name,
      url: source.url,
      maxItems: source.maxItems
    });
    return filterRawItems(source, items);
  }
  if (source.type === "openai-codex-changelog") {
    items = await fetchOpenAICodexChangelogItems({
      sourceId: source.id,
      sourceName: source.name,
      url: source.url
    });
    return filterRawItems(source, items);
  }
  if (source.type === "claude-blog") {
    items = await fetchClaudeBlogItems({
      sourceId: source.id,
      sourceName: source.name,
      url: source.url
    });
    return filterRawItems(source, items);
  }
  if (source.type === "qwen-research") {
    items = await fetchQwenResearchItems({
      sourceId: source.id,
      sourceName: source.name,
      url: source.url
    });
    return filterRawItems(source, items);
  }
  if (source.type === "kimi-blog") {
    items = await fetchKimiBlogItems({
      sourceId: source.id,
      sourceName: source.name,
      url: source.url
    });
    return filterRawItems(source, items);
  }
  if (source.type === "stanford-ai-lab-blog") {
    items = await fetchStanfordAiLabBlogItems({
      sourceId: source.id,
      sourceName: source.name,
      url: source.url,
      maxItems: source.maxItems
    });
    return filterRawItems(source, items);
  }
  if (source.type === "vector-publications") {
    items = await fetchVectorPublicationItems({
      sourceId: source.id,
      sourceName: source.name,
      url: source.url,
      maxItems: source.maxItems
    });
    return filterRawItems(source, items);
  }
  if (source.type === "twitter-user-posts") {
    items = await fetchTwitterUserPostItems({
      sourceId: source.id,
      sourceName: source.name,
      url: source.url,
      maxItems: source.maxItems
    });
    return filterRawItems(source, items);
  }
  if (source.type === "codex-radar") {
    items = await fetchCodexRadarItems({
      sourceId: source.id,
      sourceName: source.name,
      url: source.url
    });
    return filterRawItems(source, items);
  }
  if (source.type === "zhipu-model-family") {
    items = await fetchZhipuModelFamilyItems({
      sourceId: source.id,
      sourceName: source.name,
      url: source.url
    });
    return filterRawItems(source, items);
  }
  items = await fetchMarkdownChangelogItems({
    sourceId: source.id,
    sourceName: source.name,
    url: source.url
  });
  return filterRawItems(source, items);
}

function shouldHydrateFullArticleContent(source: Source): boolean {
  return source.id === "openai-research-index";
}

async function hydrateRawItemContent(items: RawItem[]): Promise<RawItem[]> {
  return mapWithConcurrency(items, getContentFetchConcurrency(), async (item) => {
    const content = await fetchArticleContent(item.canonicalUrl).catch(() => null);
    return content ? { ...item, content } : item;
  });
}

function filterRawItems(source: Source, items: RawItem[]): RawItem[] {
  const includePatterns = compilePatterns(source.includeTextPatterns);
  const excludePatterns = compilePatterns(source.excludeTextPatterns);
  const includeCategories = normalizeCategories(source.includeCategories);
  const excludeCategories = normalizeCategories(source.excludeCategories);
  if (
    includePatterns.length === 0 &&
    excludePatterns.length === 0 &&
    includeCategories.size === 0 &&
    excludeCategories.size === 0
  ) {
    return limitItems(source, items);
  }

  const filtered = items.filter((item) => {
    const categories = normalizeCategories(item.categories);
    const text = [item.title, item.excerpt, item.content, item.canonicalUrl, ...(item.categories ?? [])]
      .filter(Boolean)
      .join(" ");
    if ([...categories].some((category) => excludeCategories.has(category))) return false;
    if (excludePatterns.some((pattern) => pattern.test(text))) return false;
    if (includeCategories.size === 0 && includePatterns.length === 0) return true;
    if ([...categories].some((category) => includeCategories.has(category))) return true;
    return includePatterns.some((pattern) => pattern.test(text));
  });
  return limitItems(source, filtered);
}

function limitItems(source: Source, items: RawItem[]): RawItem[] {
  return typeof source.maxItems === "number" ? items.slice(0, source.maxItems) : items;
}

function compilePatterns(patterns?: string[]): RegExp[] {
  return (patterns ?? []).map((pattern) => new RegExp(pattern, "i"));
}

function normalizeCategories(categories?: string[]): Set<string> {
  return new Set((categories ?? []).map((category) => category.trim().toLowerCase()).filter(Boolean));
}

function persistRawItem(source: Source, raw: RawItem) {
  const ranked = rankItem({
    title: raw.title,
    summary: raw.excerpt ?? raw.content,
    categories: raw.categories,
    sourceCategory: source.category
  });
  const summary = makeExtractiveSummary({
    title: raw.title,
    content: raw.content,
    excerpt: raw.excerpt,
    tags: ranked.tags,
    importance: ranked.importance
  });
  const id = computeItemHash({
    sourceId: source.id,
    canonicalUrl: raw.canonicalUrl,
    title: raw.title
  });

  upsertItem({
    id,
    source,
    title: raw.title,
    canonicalUrl: raw.canonicalUrl,
    publishedAt: raw.publishedAt ?? null,
    submittedAt: raw.submittedAt ?? null,
    excerpt: raw.excerpt ?? null,
    content: raw.content ?? null,
    sourceOrder: raw.sourceOrder ?? null,
    importance: ranked.importance,
    tags: ranked.tags,
    summary: summary.summary,
    whyItMatters: summary.whyItMatters,
    action: summary.action
  });
}

function getSourceFetchConcurrency(): number {
  return parsePositiveInteger(
    process.env.BRIEF_SOURCE_FETCH_CONCURRENCY,
    DEFAULT_SOURCE_FETCH_CONCURRENCY
  );
}

function getContentFetchConcurrency(): number {
  return parsePositiveInteger(
    process.env.BRIEF_CONTENT_FETCH_CONCURRENCY,
    DEFAULT_CONTENT_FETCH_CONCURRENCY
  );
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
