import { NextRequest, NextResponse } from "next/server";

import { getRecentFetchRuns, listBriefItems, listItems, listSources, searchItemsByTitle } from "@/lib/db";
import { itemSortTimestamp } from "@/lib/date-format";
import {
  isHuggingFaceDailySource,
  isHuggingFaceTrendingSource,
  selectHuggingFaceDailyItems,
  sortHuggingFaceTrendingItems
} from "@/lib/huggingface-display";
import { ensureLocalSchedulerStarted } from "@/lib/local-scheduler";
import { aggregateSourceIds, getAggregateNavScope, selectAggregatePreviewItems } from "@/lib/nav-aggregation";
import { PLAZA_SOURCE_IDS, selectLatestPerPlazaGroup } from "@/lib/plaza";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CODING_SOURCE_IDS = ["openai-codex-blog", "openai-codex-changelog", "claude-blog-posts"];
const GITHUB_TRENDING_SOURCE_IDS = ["github-trending"];
const OPENREVIEW_SOURCE_IDS = [
  "openreview-iclr-2026",
  "openreview-neurips-2025",
  "openreview-icml-2025",
  "openreview-colm-2025"
];
const ARXIV_SOURCE_IDS = [
  "arxiv-cs-ai",
  "arxiv-cs-lg",
  "arxiv-cs-cl",
  "arxiv-cs-cv",
  "arxiv-cs-ro",
  "arxiv-stat-ml"
];
const PAPERS_SOURCE_IDS = [
  "huggingface-daily-papers",
  "huggingface-trending-papers",
  ...ARXIV_SOURCE_IDS,
  ...OPENREVIEW_SOURCE_IDS
];
const LAB_SOURCE_IDS = ["stanford-ai-lab-blog", "bair-blog", "cmu-ml-blog", "mila-blog", "vector-publications"];
const MATHEMATICS_SOURCE_IDS = [
  "optimization-online",
  "mathprog-journal",
  "siam-optimization",
  "informs-mor",
  "jmlr-papers",
  "pmlr-colt",
  "pmlr-alt",
  "pmlr-aistats",
  "pmlr-uai",
  "statistics-computing",
  "siam-sisc",
  "siam-sinum",
  "siam-mds"
];
const ZHIPU_MODEL_ORDER = ["GLM-5.2", "GLM-5V-Turbo", "GLM-Image", "GLM-OCR", "GLM-ASR", "GLM-TTS"];
const VENDOR_DEFAULT_SOURCE_IDS: Record<string, string[]> = {
  OpenAI: ["openai-research-index"],
  Anthropic: ["anthropic-research"],
  Kimi: ["kimi-blog"],
  MiniMax: ["minimax-blog"],
  ZhipuAI: ["zhipu-model-family"]
};
const PAGE_SIZE = 10;
const GITHUB_TRENDING_PAGE_SIZE = 8;

export async function GET(request: NextRequest) {
  ensureLocalSchedulerStarted();
  const { searchParams } = new URL(request.url);
  const vendor = searchParams.get("vendor") ?? undefined;
  const sources = searchParams.getAll("source");
  const aggregateScope = getAggregateNavScope(searchParams.get("aggregateScope"));
  const view = searchParams.get("view") ?? (vendor || sources.length > 0 ? "items" : "plaza");
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);

  if (view === "search") {
    const allItems = searchItemsByTitle({ q: searchParams.get("q") ?? undefined });
    const pageSize = PAGE_SIZE;
    const total = allItems.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const currentPage = Math.min(page, totalPages);
    const start = (currentPage - 1) * pageSize;
    const items = allItems.slice(start, start + pageSize);

    return NextResponse.json({
      items,
      pagination: {
        page: currentPage,
        pageSize,
        total,
        totalPages,
        hasPrevious: currentPage > 1,
        hasNext: currentPage < totalPages
      },
      sources: listSources(),
      fetchRuns: getRecentFetchRuns()
    });
  }

  if (aggregateScope) {
    const items = selectAggregatePreviewItems(
      listItems({
        q: searchParams.get("q") ?? undefined,
        unreadOnly: searchParams.get("unread") === "1",
        sourceIds: aggregateSourceIds(aggregateScope),
        sort: "ranked"
      }),
      aggregateScope
    );
    return NextResponse.json({
      items,
      pagination: {
        page: 1,
        pageSize: items.length,
        total: items.length,
        totalPages: 1,
        hasPrevious: false,
        hasNext: false
      },
      sources: listSources(),
      fetchRuns: getRecentFetchRuns()
    });
  }

  const sourceIds =
    view === "coding" && sources.length === 0
      ? CODING_SOURCE_IDS
      : view === "papers" && sources.length === 0
        ? PAPERS_SOURCE_IDS
        : view === "labs" && sources.length === 0
          ? LAB_SOURCE_IDS
          : view === "mathematics" && sources.length === 0
            ? MATHEMATICS_SOURCE_IDS
            : view === "github-trending" && sources.length === 0
              ? GITHUB_TRENDING_SOURCE_IDS
              : vendor && sources.length === 0
                ? (VENDOR_DEFAULT_SOURCE_IDS[vendor] ?? sources)
                : sources;
  const listFn = sources.length > 0 ? listItems : listBriefItems;
  let allItems = listFn({
    q: searchParams.get("q") ?? undefined,
    tag:
      view === "coding"
        ? "coding-agent"
        : view === "github-trending"
          ? "github-trending"
          : view === "papers" || view === "labs" || view === "mathematics"
            ? "research"
            : (searchParams.get("tag") ?? undefined),
    unreadOnly: searchParams.get("unread") === "1",
    vendor,
    sourceIds: sourceIds.length > 0 ? sourceIds : undefined,
    sort: vendor ? "latest" : "ranked"
  });
  if (view === "plaza") {
    allItems = selectLatestPerPlazaGroup(
      listItems({
        q: searchParams.get("q") ?? undefined,
        unreadOnly: searchParams.get("unread") === "1",
        sourceIds: Array.from(PLAZA_SOURCE_IDS),
        sort: "latest"
      })
    );
  }
  if (sources.length > 0) {
    if (isHuggingFaceDailySource(sources)) {
      allItems = selectHuggingFaceDailyItems(allItems);
    } else if (isHuggingFaceTrendingSource(sources)) {
      allItems = sortHuggingFaceTrendingItems(allItems);
    } else {
      allItems = [...allItems].sort((a, b) => itemTimestamp(b) - itemTimestamp(a));
    }
  }
  if (vendor === "ZhipuAI" && sourceIds.includes("zhipu-model-family")) {
    allItems = [...allItems].sort((a, b) => {
      const aIndex = ZHIPU_MODEL_ORDER.indexOf(a.title);
      const bIndex = ZHIPU_MODEL_ORDER.indexOf(b.title);
      if (aIndex >= 0 && bIndex >= 0) return aIndex - bIndex;
      if (aIndex >= 0) return -1;
      if (bIndex >= 0) return 1;
      return 0;
    });
  }
  const pageSize = view === "github-trending" ? GITHUB_TRENDING_PAGE_SIZE : view === "plaza" ? 24 : PAGE_SIZE;
  const total = allItems.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const items = allItems.slice(start, start + pageSize);

  return NextResponse.json({
    items,
    pagination: {
      page: currentPage,
      pageSize,
      total,
      totalPages,
      hasPrevious: currentPage > 1,
      hasNext: currentPage < totalPages
    },
    sources: listSources(),
    fetchRuns: getRecentFetchRuns()
  });
}

function itemTimestamp(item: { submittedAt: string | null; publishedAt: string | null; createdAt: string }): number {
  return itemSortTimestamp(item);
}
