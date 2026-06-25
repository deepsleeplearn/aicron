"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  RefreshCcw,
  Search,
  Send,
  Star,
  X
} from "lucide-react";
import type {
  CSSProperties,
  FormEvent as ReactFormEvent,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  WheelEvent as ReactWheelEvent
} from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import rehypeKatex from "rehype-katex";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

import { hasDisplayableArticleContent } from "@/lib/article-display";
import { parseAssistantCommand } from "@/lib/assistant-commands";
import { DASHBOARD_AUTO_SYNC_INTERVAL_MS, shouldAutoSyncDashboardItems } from "@/lib/dashboard-refresh";
import { formatItemDateLabel, isCurrentLocalItemDate } from "@/lib/date-format";
import { isFundReminderActive } from "@/lib/fund-reminder";
import { normalizeInlineMarkdownText } from "@/lib/inline-markdown";
import { selectListTeaserText } from "@/lib/list-teaser";
import { renderMathInRichHtml } from "@/lib/rich-html-math";
import { decodeRichHtmlContent, richContentToText } from "@/lib/rich-content";
import type { AssistantMessage, Source, StoredItem } from "@/lib/types";

type ItemsResponse = {
  items: StoredItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasPrevious: boolean;
    hasNext: boolean;
  };
  sources: Source[];
  fetchRuns: Array<Record<string, unknown>>;
};

type OilPriceItem = {
  label: "92#" | "95#" | "98#";
  value: string;
  delta: string | null;
  tone: "up" | "down" | "flat" | "unknown";
};

type OilPriceResponse = {
  city: "上海";
  sourceName: string;
  sourceUrl: string;
  fetchedAt: string;
  updatedAt: string | null;
  items: OilPriceItem[];
  error?: string;
};

type NavSectionId = "plaza" | "papers" | "mathematics" | "labs" | "vendors" | "coding" | "github";
type VendorTierId = "first" | "second";
type MathematicsLeafBranch = { id: string; label: string; description: string };
type MathematicsBranch = MathematicsLeafBranch & {
  aggregateScope?: string;
  children?: MathematicsLeafBranch[];
};
type MathematicsGroup = {
  id: string;
  label: string;
  aggregateScope: string;
  description: string;
  branches: MathematicsBranch[];
};

const NAV_SECTIONS: Array<{ id: NavSectionId; label: string }> = [
  { id: "plaza", label: "Plaza" },
  { id: "vendors", label: "Developers" },
  { id: "coding", label: "Coder" },
  { id: "github", label: "Github Hot" },
  { id: "papers", label: "Papers" },
  { id: "labs", label: "Labs" },
  { id: "mathematics", label: "Mathematics" }
];

const HUGGINGFACE_PAPER_BRANCHES = [
  { id: "huggingface-daily-papers", label: "Daily Papers", description: "huggingface.co/papers" },
  { id: "huggingface-trending-papers", label: "Trending Papers", description: "huggingface.co/papers/trending" }
];

const ARXIV_PAPER_BRANCHES = [
  { id: "arxiv-cs-ai", label: "cs.AI", description: "Artificial Intelligence" },
  { id: "arxiv-cs-lg", label: "cs.LG", description: "Machine Learning" },
  { id: "arxiv-cs-cl", label: "cs.CL", description: "Computation and Language" },
  { id: "arxiv-cs-cv", label: "cs.CV", description: "Computer Vision" },
  { id: "arxiv-cs-ro", label: "cs.RO", description: "Robotics" },
  { id: "arxiv-stat-ml", label: "stat.ML", description: "Statistics / Machine Learning" }
];

const OPENREVIEW_CONFERENCE_BRANCHES = [
  { id: "openreview-iclr-2026", label: "ICLR", description: "ICLR 2026 Conference" },
  { id: "openreview-neurips-2025", label: "NeurIPS", description: "NeurIPS 2025 Conference" },
  { id: "openreview-icml-2025", label: "ICML", description: "ICML 2025 Conference" },
  { id: "openreview-colm-2025", label: "COLM", description: "COLM 2025 Conference" }
];

const AI_LAB_BRANCHES = [
  { id: "stanford-ai-lab-blog", label: "Stanford AI Lab", description: "ai.stanford.edu/blog" },
  { id: "bair-blog", label: "BAIR", description: "bair.berkeley.edu/blog" },
  { id: "cmu-ml-blog", label: "CMU ML", description: "blog.ml.cmu.edu" },
  { id: "mila-blog", label: "Mila", description: "mila.quebec/en/research/blog" },
  { id: "vector-publications", label: "Vector Institute", description: "vectorinstitute.ai/research-talent/publications" }
];

const MATHEMATICS_GROUPS: MathematicsGroup[] = [
  {
    id: "optimization",
    label: "Optimization",
    aggregateScope: "mathematics:optimization",
    description: "优化理论、数学规划、运筹优化和权威优化期刊/平台。",
    branches: [
      { id: "optimization-online", label: "Optimization Online", description: "权威优化预印本平台" },
      { id: "mathprog-journal", label: "Mathematical Programming", description: "MOS 官方核心优化期刊" },
      { id: "siam-optimization", label: "SIAM Optimization", description: "SIAM Journal on Optimization" },
      { id: "informs-mor", label: "INFORMS MOR", description: "Mathematics of Operations Research" }
    ]
  },
  {
    id: "learning-theory",
    label: "Learning Theory",
    aggregateScope: "mathematics:learning-theory",
    description: "学习理论、统计学习理论、在线学习和算法学习理论。",
    branches: [
      { id: "jmlr-papers", label: "JMLR", description: "Journal of Machine Learning Research" },
      { id: "pmlr-colt", label: "COLT", description: "PMLR Conference on Learning Theory" },
      { id: "pmlr-alt", label: "ALT", description: "PMLR Algorithmic Learning Theory" }
    ]
  },
  {
    id: "statistics",
    label: "Statistics",
    aggregateScope: "mathematics:statistics",
    description: "统计理论、概率统计、统计机器学习和计算统计。",
    branches: [
      { id: "pmlr-aistats", label: "AISTATS", description: "Artificial Intelligence and Statistics" },
      { id: "pmlr-uai", label: "UAI", description: "Uncertainty in Artificial Intelligence" },
      { id: "statistics-computing", label: "Statistics and Computing", description: "计算统计期刊" }
    ]
  },
  {
    id: "applied-math",
    label: "Applied Math",
    aggregateScope: "mathematics:applied-math",
    description: "应用数学、数值分析、科学计算和数学数据科学。",
    branches: [
      {
        id: "siam-applied-math",
        label: "SIAM",
        description: "SIAM 应用数学相关期刊",
        aggregateScope: "mathematics:applied-math",
        children: [
          { id: "siam-sisc", label: "SISC", description: "SIAM Journal on Scientific Computing" },
          { id: "siam-sinum", label: "SINUM", description: "SIAM Journal on Numerical Analysis" },
          { id: "siam-mds", label: "MDS", description: "SIAM Journal on Mathematics of Data Science" }
        ]
      }
    ]
  }
];

function mathematicsBranchLeaves(branch: MathematicsBranch): MathematicsLeafBranch[] {
  return branch.children ?? [branch];
}

function mathematicsGroupLeaves(group: MathematicsGroup): MathematicsLeafBranch[] {
  return group.branches.flatMap(mathematicsBranchLeaves);
}

function findMathematicsBranch(sourceId: string): {
  group: MathematicsGroup;
  parent: MathematicsBranch | null;
  branch: MathematicsLeafBranch;
} | null {
  for (const group of MATHEMATICS_GROUPS) {
    for (const branch of group.branches) {
      for (const leaf of mathematicsBranchLeaves(branch)) {
        if (leaf.id === sourceId) {
          return { group, parent: branch.children ? branch : null, branch: leaf };
        }
      }
    }
  }
  return null;
}

const CODEX_BRANCHES = [
  { id: "openai-codex-blog", label: "Blog", description: "developers.openai.com/blog" },
  { id: "openai-codex-changelog", label: "Changelog", description: "developers.openai.com/codex/changelog" }
];

const CODING_SOURCES = [{ id: "claude-blog-posts", label: "Claude Code" }];

const QWEN_BRANCHES = [
  { id: "qwen-blog-rss", label: "Blog", description: "旧版 QwenLM Blog" },
  { id: "qwen-research", label: "Research", description: "新版 qwen.ai Research" }
];

const VENDOR_TIERS: Array<{ id: VendorTierId; label: string; vendors: string[] }> = [
  { id: "first", label: "T1", vendors: ["Anthropic", "OpenAI"] },
  { id: "second", label: "T2", vendors: ["Qwen", "Kimi", "MiniMax", "ZhipuAI"] }
];

const VENDOR_DEFAULT_SOURCE_IDS: Record<string, string[]> = {
  OpenAI: ["openai-research-index"],
  Anthropic: ["anthropic-research"],
  Kimi: ["kimi-blog"],
  MiniMax: ["minimax-blog"],
  ZhipuAI: ["zhipu-model-family"]
};

const OPENREVIEW_SOURCE_LABELS = new Map(
  OPENREVIEW_CONFERENCE_BRANCHES.map((branch) => [branch.id, `OpenReview / ${branch.label}`])
);
const ARXIV_SOURCE_LABELS = new Map(ARXIV_PAPER_BRANCHES.map((branch) => [branch.id, `arXiv / ${branch.label}`]));

const PRESET_PROMPTS = [
  {
    id: "core",
    label: "提炼核心",
    prompt: "用中文帮忙总结提炼一下本文的核心内容；"
  },
  {
    id: "outline",
    label: "梳理介绍",
    prompt: "用中文帮忙梳理介绍一下这篇文章的内容；"
  },
  {
    id: "translate",
    label: "翻译中文",
    prompt: "将这篇英文文章翻译为中文，注意专业术语的翻译需贴合文章领域与表达；"
  },
  {
    id: "abstract-summary",
    label: "摘要总结",
    prompt: "用中文翻译并总结一下该文章的摘要"
  },
  {
    id: "takeaways",
    label: "我的收获",
    prompt:
      "用中文帮忙整理一下这篇文档对于我这样的AI从业者(程序员)，有什么启发，有什么值得学习的地方，向我清晰罗列并说明理由；"
  }
];

const SLASH_COMMANDS = [
  {
    id: "web-search",
    command: "/web-search ",
    label: "联网搜索",
    description: "搜索原文和网页资料后回答"
  }
];

const PLAZA_AUTO_CARD_INTERVAL_SECONDS = 8;
const PLAZA_AUTO_DIRECTION = -1;
const OIL_SCROLL_LOOP_PX = 96;
const OIL_SCROLL_SPEED_PX_PER_SECOND = 5;

function emptyItemsResponse(): ItemsResponse {
  return {
    items: [],
    pagination: { page: 1, pageSize: 10, total: 0, totalPages: 1, hasPrevious: false, hasNext: false },
    sources: [],
    fetchRuns: []
  };
}

export function Dashboard() {
  const [data, setData] = useState<ItemsResponse>(emptyItemsResponse);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<StoredItem | null>(null);
  const [page, setPage] = useState(1);
  const [pageJumpValue, setPageJumpValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchPage, setSearchPage] = useState(1);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchData, setSearchData] = useState<ItemsResponse>(emptyItemsResponse);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [section, setSection] = useState<NavSectionId>("plaza");
  const [vendorFilter, setVendorFilter] = useState("OpenAI");
  const [vendorSource, setVendorSource] = useState<string | null>(null);
  const [qwenExpanded, setQwenExpanded] = useState(false);
  const [codexExpanded, setCodexExpanded] = useState(false);
  const [huggingFaceExpanded, setHuggingFaceExpanded] = useState(false);
  const [arxivExpanded, setArxivExpanded] = useState(false);
  const [openReviewExpanded, setOpenReviewExpanded] = useState(false);
  const [codingSource, setCodingSource] = useState("all");
  const [paperSource, setPaperSource] = useState("huggingface-daily-papers");
  const [mathSource, setMathSource] = useState("optimization-online");
  const [mathExpandedGroup, setMathExpandedGroup] = useState<string | null>(null);
  const [mathExpandedSubgroup, setMathExpandedSubgroup] = useState<string | null>(null);
  const [labSource, setLabSource] = useState("stanford-ai-lab-blog");
  const [aggregateScopeId, setAggregateScopeId] = useState<string | null>(null);
  const [vendorTierExpanded, setVendorTierExpanded] = useState<Record<VendorTierId, boolean>>({
    first: false,
    second: false
  });
  const [expandedSections, setExpandedSections] = useState<Record<NavSectionId, boolean>>({
    plaza: true,
    papers: false,
    mathematics: false,
    labs: false,
    vendors: false,
    coding: false,
    github: false
  });
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [cornerActionsOpen, setCornerActionsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [assistantInput, setAssistantInput] = useState("");
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [codexBusy, setCodexBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [oilPrice, setOilPrice] = useState<OilPriceResponse | null>(null);
  const [oilScrollOffset, setOilScrollOffset] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [plazaOffset, setPlazaOffset] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(1280);
  const loadRequestId = useRef(0);
  const searchRequestId = useRef(0);
  const selectedIdRef = useRef<string | null>(null);
  const cardTextOpenGuardRef = useRef<{ itemId: string; until: number } | null>(null);
  const cornerActionDockRef = useRef<HTMLDivElement | null>(null);
  const topSearchRef = useRef<HTMLDivElement | null>(null);
  const oilScrollOffsetRef = useRef(0);
  const plazaPhaseRef = useRef(0);
  const plazaVelocityRef = useRef(0);
  const plazaSettlingRef = useRef(false);
  const plazaDragRef = useRef<{ active: boolean; moved: boolean; lastX: number; lastAt: number }>({
    active: false,
    moved: false,
    lastX: 0,
    lastAt: 0
  });
  const plazaPointerItemIdRef = useRef<string | null>(null);
  const isAggregatePreview = aggregateScopeId !== null;
  const isCoverflowMode = !selectedItem && (section === "plaza" || isAggregatePreview);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    if (!cornerActionsOpen) return;

    const handlePointerDown = (event: globalThis.PointerEvent) => {
      if (!cornerActionDockRef.current?.contains(event.target as Node)) {
        setCornerActionsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setCornerActionsOpen(false);
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [cornerActionsOpen]);

  useEffect(() => {
    if (!searchOpen) return;

    const handlePointerDown = (event: globalThis.PointerEvent) => {
      if (!topSearchRef.current?.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSearchOpen(false);
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [searchOpen]);

  useEffect(() => {
    const query = searchQuery.trim();
    if (!query) {
      searchRequestId.current += 1;
      setSearchOpen(false);
      setSearchLoading(false);
      setSearchData(emptyItemsResponse());
      return;
    }

    setSearchOpen(true);
    setSearchLoading(true);
    const requestId = searchRequestId.current + 1;
    searchRequestId.current = requestId;
    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        params.set("view", "search");
        params.set("q", query);
        params.set("page", String(searchPage));
        const response = await fetch(`/api/items?${params.toString()}`, { cache: "no-store" });
        if (!response.ok) throw new Error("搜索失败。");
        const payload = (await response.json()) as ItemsResponse;
        if (requestId !== searchRequestId.current) return;
        setSearchData(payload);
      } catch {
        if (requestId !== searchRequestId.current) return;
        setSearchData(emptyItemsResponse());
      } finally {
        if (requestId === searchRequestId.current) setSearchLoading(false);
      }
    }, 180);

    return () => window.clearTimeout(timer);
  }, [searchPage, searchQuery]);

  async function loadItems(nextSelectedId = selectedId, options: { silent?: boolean } = {}) {
    const requestId = loadRequestId.current + 1;
    loadRequestId.current = requestId;
    if (!options.silent) setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (aggregateScopeId) params.set("aggregateScope", aggregateScopeId);
      if (!aggregateScopeId && section === "plaza") params.set("view", "plaza");
      if (!aggregateScopeId && section === "papers") {
        params.set("view", "papers");
        if (paperSource !== "all") params.append("source", paperSource);
      }
      if (!aggregateScopeId && section === "mathematics") {
        params.set("view", "mathematics");
        if (mathSource !== "all") params.append("source", mathSource);
      }
      if (!aggregateScopeId && section === "labs") {
        params.set("view", "labs");
        if (labSource !== "all") params.append("source", labSource);
      }
      if (!aggregateScopeId && section === "github") params.set("view", "github-trending");
      if (!aggregateScopeId && section === "vendors") {
        params.set("view", "vendors");
        params.set("vendor", vendorFilter);
        const sourceIds = vendorSource ? [vendorSource] : (VENDOR_DEFAULT_SOURCE_IDS[vendorFilter] ?? []);
        sourceIds.forEach((sourceId) => params.append("source", sourceId));
      }
      if (!aggregateScopeId && section === "coding") {
        params.set("view", "coding");
        if (codingSource !== "all") params.append("source", codingSource);
      }
      if (unreadOnly) params.set("unread", "1");
      params.set("page", String(page));
      const response = await fetch(`/api/items?${params.toString()}`, { cache: "no-store" });
      if (!response.ok) throw new Error("列表加载失败。");
      const payload = (await response.json()) as ItemsResponse;
      if (requestId !== loadRequestId.current) return;
      if (options.silent && selectedIdRef.current) return;
      setData(payload);
      const target = nextSelectedId
        ? (payload.items.find((item) => item.id === nextSelectedId) ?? null)
        : null;
      setSelectedId(target?.id ?? null);
      setSelectedItem(target);
    } catch (reason) {
      if (requestId !== loadRequestId.current) return;
      setError(reason instanceof Error ? reason.message : "列表加载失败。");
    } finally {
      if (requestId === loadRequestId.current && !options.silent) setLoading(false);
    }
  }

  async function loadOilPrice(options: { force?: boolean } = {}) {
    try {
      const response = await fetch(`/api/oil-price${options.force ? "?refresh=1" : ""}`, { cache: "no-store" });
      if (!response.ok) throw new Error("油价加载失败。");
      setOilPrice((await response.json()) as OilPriceResponse);
    } catch (reason) {
      setOilPrice({
        city: "上海",
        sourceName: "汽油价格网",
        sourceUrl: "http://www.qiyoujiage.com/shanghai.shtml",
        fetchedAt: new Date().toISOString(),
        updatedAt: null,
        items: [],
        error: reason instanceof Error ? reason.message : "油价暂不可用"
      });
    }
  }

  useEffect(() => {
    void loadItems();
    void loadOilPrice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncReducedMotion = () => setReducedMotion(mediaQuery.matches);
    syncReducedMotion();
    mediaQuery.addEventListener("change", syncReducedMotion);
    return () => mediaQuery.removeEventListener("change", syncReducedMotion);
  }, []);

  useEffect(() => {
    if ((oilPrice?.items.length ?? 0) <= 1 || reducedMotion) return;

    let frame = 0;
    let previous = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(64, now - previous) / 1000;
      previous = now;
      const next = normalizeOilScroll(oilScrollOffsetRef.current + OIL_SCROLL_SPEED_PX_PER_SECOND * dt);
      oilScrollOffsetRef.current = next;
      setOilScrollOffset(next);
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [oilPrice?.items.length, reducedMotion]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadItems(), 220);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, section, vendorFilter, vendorSource, codingSource, paperSource, mathSource, labSource, aggregateScopeId, unreadOnly]);

  useEffect(() => {
    const sync = () => {
      if (
        shouldAutoSyncDashboardItems({
          hasSelectedItem: Boolean(selectedIdRef.current),
          visibilityState: document.visibilityState
        })
      ) {
        void loadItems(null, { silent: true });
      }
    };

    const timer = window.setInterval(sync, DASHBOARD_AUTO_SYNC_INTERVAL_MS);
    document.addEventListener("visibilitychange", sync);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", sync);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, section, vendorFilter, vendorSource, codingSource, paperSource, mathSource, labSource, aggregateScopeId, unreadOnly]);

  useEffect(() => {
    setPlazaOffset(0);
    plazaPhaseRef.current = 0;
    plazaVelocityRef.current = 0;
    plazaSettlingRef.current = false;
  }, [section, aggregateScopeId, data.items.length]);

  useEffect(() => {
    const updateWidth = () => setViewportWidth(window.innerWidth);
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isCoverflowMode || data.items.length <= 1) return;

    let frame = 0;
    let previous = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(48, now - previous) / 1000;
      previous = now;

      if (plazaDragRef.current.active) {
        plazaVelocityRef.current *= Math.pow(0.32, dt);
      } else if (plazaSettlingRef.current) {
        plazaPhaseRef.current += plazaVelocityRef.current * dt;
        plazaVelocityRef.current *= Math.pow(0.13, dt);
        if (Math.abs(plazaVelocityRef.current) < 0.015) {
          plazaPhaseRef.current = easePlazaTowardNearestSlot(plazaPhaseRef.current, data.items.length, 0.075);
          if (plazaDistanceToNearestSlot(plazaPhaseRef.current, data.items.length) < 0.0008) {
            plazaPhaseRef.current = snapPlazaToNearestSlot(plazaPhaseRef.current, data.items.length);
            plazaVelocityRef.current = 0;
            plazaSettlingRef.current = false;
          }
        }
      } else {
        plazaPhaseRef.current +=
          (PLAZA_AUTO_DIRECTION * dt) / (PLAZA_AUTO_CARD_INTERVAL_SECONDS * data.items.length);
      }

      plazaPhaseRef.current = normalizePhase(plazaPhaseRef.current);
      setPlazaOffset(plazaPhaseRef.current);
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [data.items.length, isCoverflowMode]);

  async function selectItem(item: StoredItem) {
    selectedIdRef.current = item.id;
    setSelectedId(item.id);
    setSelectedItem(item);
    setMessages([]);
    setDetailLoadingId(item.id);
    try {
      const [detailResponse, historyResponse] = await Promise.all([
        fetch(`/api/items/${item.id}`, { cache: "no-store" }),
        fetch(`/api/codex?itemId=${encodeURIComponent(item.id)}`, { cache: "no-store" })
      ]);
      if (!detailResponse.ok) throw new Error("文章详情加载失败。");
      const detailPayload = (await detailResponse.json()) as { item?: StoredItem };
      if (detailPayload.item) {
        setSelectedItem((current) => (current?.id === item.id ? detailPayload.item! : current));
      }
      if (historyResponse.ok) {
        const historyPayload = (await historyResponse.json()) as { messages?: AssistantMessage[] };
        setMessages((current) => {
          if (selectedIdRef.current !== item.id) return current;
          return historyPayload.messages ?? [];
        });
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "文章详情加载失败。");
    } finally {
      setDetailLoadingId((current) => (current === item.id ? null : current));
    }
  }

  function handleCardTextOpen(
    event: ReactPointerEvent<HTMLElement> | ReactMouseEvent<HTMLElement> | ReactKeyboardEvent<HTMLElement>,
    item: StoredItem
  ) {
    event.preventDefault();
    event.stopPropagation();
    const now = Date.now();
    const guardedOpen = cardTextOpenGuardRef.current;
    if (guardedOpen?.itemId === item.id && guardedOpen.until > now) return;
    cardTextOpenGuardRef.current = { itemId: item.id, until: now + 400 };
    void selectItem(item);
  }

  function handleCardTextKeyDown(event: ReactKeyboardEvent<HTMLElement>, item: StoredItem) {
    if (event.key !== "Enter" && event.key !== " ") return;
    handleCardTextOpen(event, item);
  }

  async function refresh() {
    setRefreshing(true);
    setError(null);
    try {
      const response = await fetch("/api/refresh", { method: "POST" });
      if (!response.ok) throw new Error("刷新失败，请检查网络或源配置。");
      await Promise.all([loadItems(), loadOilPrice({ force: true })]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "刷新失败，请检查网络或源配置。");
    } finally {
      setRefreshing(false);
    }
  }

  function handleOilWheel(event: ReactWheelEvent<HTMLElement>) {
    if (!oilPrice?.items.length) return;
    event.preventDefault();
    const next = normalizeOilScroll(oilScrollOffsetRef.current + event.deltaY * 0.35);
    oilScrollOffsetRef.current = next;
    setOilScrollOffset(next);
  }

  async function toggleRead(item: StoredItem) {
    const response = await fetch("/api/read-state", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ itemId: item.id, read: !item.readAt })
    });
    if (!response.ok) {
      setError("已读状态更新失败。");
      return;
    }
    await loadItems();
  }

  async function toggleStar(item: StoredItem) {
    const response = await fetch("/api/read-state", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ itemId: item.id, starred: !item.starred })
    });
    if (!response.ok) {
      setError("收藏状态更新失败。");
      return;
    }
    await loadItems();
  }

  async function askCodex(question: string, displayText = question) {
    if (!selectedItem || !question.trim()) return;
    const command = parseAssistantCommand(question);
    setCodexBusy(true);
    setError(null);
    const nextMessages: AssistantMessage[] = [
      ...messages,
      { role: "user", content: displayText === question ? command.displayText : displayText }
    ];
    setMessages(nextMessages);
    setAssistantInput("");
    try {
      const response = await fetch("/api/codex", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          itemId: selectedItem.id,
          prompt: command.prompt,
          history: messages,
          webSearch: command.webSearch
        })
      });
      const payload = (await response.json()) as { output?: string; error?: string };
      const reply = payload.output ?? payload.error ?? "Codex 调用失败。";
      setMessages([...nextMessages, { role: "assistant", content: reply }]);
      if (!response.ok) setError(reply);
    } catch (reason) {
      const reply = reason instanceof Error ? reason.message : "Codex 调用失败。";
      setMessages([...nextMessages, { role: "assistant", content: reply }]);
      setError(reply);
    } finally {
      setCodexBusy(false);
    }
  }

  function switchSection(nextSection: NavSectionId) {
    const nextHasChildren = navSectionHasChildren(nextSection);
    setSection(nextSection);
    setExpandedSections((current) => {
      if (!nextHasChildren) return current;
      return { ...current, [nextSection]: !current[nextSection] || section !== nextSection };
    });
    setVendorSource(null);
    setCodingSource("all");
    setPaperSource("huggingface-daily-papers");
    setMathSource("optimization-online");
    setMathExpandedGroup(null);
    setMathExpandedSubgroup(null);
    setLabSource("stanford-ai-lab-blog");
    setAggregateScopeId(nextHasChildren ? nextSection : null);
    setVendorTierExpanded({ first: false, second: false });
    setQwenExpanded(false);
    setCodexExpanded(false);
    setHuggingFaceExpanded(false);
    setArxivExpanded(false);
    setOpenReviewExpanded(false);
    setPage(1);
    clearSelection();
    if (nextSection === "vendors") {
      setVendorFilter((current) => current || "OpenAI");
    }
  }

  function clearSelection() {
    selectedIdRef.current = null;
    setSelectedId(null);
    setSelectedItem(null);
    setMessages([]);
    setAssistantInput("");
    setDetailLoadingId(null);
  }

  function goToPage(nextPage: number) {
    setPage(Math.max(1, nextPage));
    clearSelection();
  }

  function handleSearchQueryChange(value: string) {
    setSearchQuery(value);
    setSearchPage(1);
    if (value.trim()) setSearchOpen(true);
  }

  function goToSearchPage(nextPage: number) {
    setSearchPage(Math.max(1, Math.min(searchData.pagination.totalPages, nextPage)));
    if (searchQuery.trim()) setSearchOpen(true);
  }

  function handleSearchResultSelect(item: StoredItem) {
    setSearchOpen(false);
    void selectItem(item);
  }

  function handleSearchResultPointerDown(event: ReactPointerEvent<HTMLButtonElement>, item: StoredItem) {
    event.preventDefault();
    event.stopPropagation();
    handleSearchResultSelect(item);
  }

  function handleSearchResultKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>, item: StoredItem) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    event.stopPropagation();
    handleSearchResultSelect(item);
  }

  function handlePageJumpSubmit(event: ReactFormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = Number.parseInt(pageJumpValue, 10);
    if (!Number.isFinite(parsed)) return;
    const targetPage = Math.min(data.pagination.totalPages, Math.max(1, parsed));
    goToPage(targetPage);
    setPageJumpValue("");
  }

  function scrollPlaza(direction: "previous" | "next") {
    if (data.items.length <= 1) return;
    const delta = direction === "next" ? 1 : -1;
    plazaVelocityRef.current = 0;
    plazaSettlingRef.current = false;
    plazaPhaseRef.current = normalizePhase(plazaPhaseRef.current + delta / data.items.length);
    setPlazaOffset(plazaPhaseRef.current);
  }

  function handlePlazaWheel(event: ReactWheelEvent<HTMLElement>) {
    const delta = horizontalWheelDelta(event);
    if (Math.abs(delta) < 1 || data.items.length <= 1) return;
    event.preventDefault();
    applyPlazaGestureDelta(delta, 1);
  }

  function handlePlazaPointerDown(event: ReactPointerEvent<HTMLElement>) {
    if (event.button !== 0 || data.items.length === 0) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest("a, button")) {
      plazaPointerItemIdRef.current = null;
      return;
    }
    plazaPointerItemIdRef.current = target?.closest<HTMLElement>("[data-plaza-item-id]")?.dataset.plazaItemId ?? null;
    event.currentTarget.setPointerCapture(event.pointerId);
    plazaDragRef.current = {
      active: true,
      moved: false,
      lastX: event.clientX,
      lastAt: performance.now()
    };
    plazaSettlingRef.current = true;
  }

  function handlePlazaPointerMove(event: ReactPointerEvent<HTMLElement>) {
    if (!plazaDragRef.current.active || data.items.length <= 1) return;

    const now = performance.now();
    const delta = plazaDragRef.current.lastX - event.clientX;
    const elapsed = Math.max(12, now - plazaDragRef.current.lastAt);
    const moved = plazaDragRef.current.moved || Math.abs(delta) > 3;

    plazaDragRef.current = {
      active: true,
      moved,
      lastX: event.clientX,
      lastAt: now
    };

    applyPlazaGestureDelta(delta, 1.35);
    plazaVelocityRef.current = clamp(delta / elapsed, -1.2, 1.2);
  }

  function handlePlazaPointerUp(event: ReactPointerEvent<HTMLElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    const pendingItemId = plazaPointerItemIdRef.current;
    plazaPointerItemIdRef.current = null;
    if (plazaDragRef.current.moved) {
      plazaDragRef.current.active = false;
      return;
    }
    if (pendingItemId) {
      const item = data.items.find((candidate) => candidate.id === pendingItemId);
      if (item) void selectItem(item);
    }
    plazaDragRef.current.active = false;
  }

  function applyPlazaGestureDelta(delta: number, multiplier: number) {
    if (data.items.length <= 1) return;

    plazaPhaseRef.current = normalizePhase(plazaPhaseRef.current + delta * multiplier * 0.00072);
    plazaVelocityRef.current = clamp(plazaVelocityRef.current + delta * multiplier * 0.0008, -0.9, 0.9);
    plazaSettlingRef.current = true;
    setPlazaOffset(plazaPhaseRef.current);
  }

  const headerCopy = useMemo(() => {
    if (section === "vendors") {
      const branch = QWEN_BRANCHES.find((item) => item.id === vendorSource);
      if (vendorFilter === "Qwen" && branch) {
        return {
          title: `Qwen / ${branch.label}`,
          description:
            branch.id === "qwen-research"
              ? "只看 qwen.ai 新版 Research 源中的模型、Agent、开源和研究内容。"
              : "只看 QwenLM 旧版 Blog 源中的模型、Agent、开源和研究内容。"
        };
      }
      if (vendorFilter === "OpenAI") {
        return {
          title: "OpenAI",
          description: "只看 openai.com/research/index/ 下的研究、模型、安全和科学类内容。"
        };
      }
      if (vendorFilter === "Anthropic") {
        return {
          title: "Anthropic",
          description: "只看 anthropic.com/research 下的研究、模型、安全和科学类内容。"
        };
      }
      if (vendorFilter === "MiniMax") {
        return {
          title: "MiniMax",
          description: "只看 minimaxi.com/blog 下的模型、Agent、研究和技术文章。"
        };
      }
      if (vendorFilter === "Kimi") {
        return {
          title: "Kimi",
          description: "只看 kimi.com/blog 下的模型、Agent、研究和技术文章。"
        };
      }
      if (vendorFilter === "ZhipuAI") {
        return {
          title: "ZhipuAI",
          description: "只看智谱官网首页罗列的 GLM 旗舰模型家族。"
        };
      }
      return {
        title: vendorFilter,
        description: `只看 ${vendorFilter} 相关 RSS、技术文档和观点发布。`
      };
    }
    if (section === "coding") {
      const codexBranch = CODEX_BRANCHES.find((item) => item.id === codingSource);
      if (codexBranch) {
        return {
          title: `Codex / ${codexBranch.label}`,
          description:
            codexBranch.id === "openai-codex-blog"
              ? "只看 OpenAI Developers Blog 中与 Codex、Agent 和开发者工具相关的内容。"
              : "只看 OpenAI Codex 官方 Changelog 中的重要变更。"
        };
      }
      return {
        title: "Coder",
        description: "Codex Blog、Codex Changelog 和 Claude Code 相关的重要内容。"
      };
    }
    if (section === "papers") {
      const paperBranch = HUGGINGFACE_PAPER_BRANCHES.find((item) => item.id === paperSource);
      if (paperBranch) {
        return {
          title: `HuggingFace / ${paperBranch.label}`,
          description:
            paperBranch.id === "huggingface-daily-papers"
              ? "Hugging Face Daily Papers 中最近一周社区提交和讨论的 AI 论文，按提交时间倒序展示。"
              : "Hugging Face Trending Papers 中最新趋势论文，按提交时间倒序展示。"
        };
      }
      const arxivBranch = ARXIV_PAPER_BRANCHES.find((item) => item.id === paperSource);
      if (arxivBranch) {
        return {
          title: `arXiv / ${arxivBranch.label}`,
          description: `按 arXiv ${arxivBranch.description} 分类拉取最新提交论文，按提交时间倒序展示。`
        };
      }
      const openReviewBranch = OPENREVIEW_CONFERENCE_BRANCHES.find((item) => item.id === paperSource);
      if (openReviewBranch) {
        return {
          title: `OpenReview / ${openReviewBranch.label}`,
          description: `按 OpenReview ${openReviewBranch.description} venue 拉取近期公开论文。`
        };
      }
      return {
        title: "Papers",
        description: "AI、大模型和 Agent 方向的论文发现流。"
      };
    }
    if (section === "mathematics") {
      const match = findMathematicsBranch(mathSource);
      if (match) {
        return {
          title: match.parent
            ? `${match.group.label} / ${match.parent.label} / ${match.branch.label}`
            : `${match.group.label} / ${match.branch.label}`,
          description: `${match.branch.description}。${match.group.description}`
        };
      }
      return {
        title: "Mathematics",
        description: "优化理论、学习理论、统计理论和应用数学方向的权威期刊、会议和平台。"
      };
    }
    if (section === "labs") {
      const labBranch = AI_LAB_BRANCHES.find((item) => item.id === labSource);
      if (labBranch) {
        return {
          title: labBranch.label,
          description: `只看 ${labBranch.description} 中由高校 AI 实验室发布的研究博客和技术文章。`
        };
      }
      return {
        title: "Labs",
        description: "高校 AI 实验室发布的研究博客和技术文章。"
      };
    }
    if (section === "github") {
      return {
        title: "Github Hot",
        description: "当天 GitHub Trending 项目，附项目简介、语言、Star 信息和仓库直达链接。"
      };
    }
    return {
      title: "Plaza",
      description: "各个最底层栏目里最新的一篇文章或博客，排除 Github Hot，适合先快速滑动浏览。"
    };
  }, [section, vendorFilter, vendorSource, codingSource, paperSource, mathSource, labSource]);
  const selectedParagraphs = selectedItem ? articleParagraphs(selectedItem) : [];
  const selectedRichHtml =
    selectedItem && hasDisplayableArticleContent(selectedItem)
      ? decodeRichHtmlContent(selectedItem.content)
      : null;
  const maxGithubToday = useMemo(() => {
    return Math.max(1, ...data.items.map((item) => githubTodayCount(item)));
  }, [data.items]);
  const plazaCards = useMemo(
    () =>
      data.items.map((item, index) => ({
        item,
        index,
        pose: plazaCoverPose(index, plazaOffset, data.items.length, viewportWidth)
      })),
    [data.items, plazaOffset, viewportWidth]
  );
  const trimmedAssistantInput = assistantInput.trim();
  const showPromptMenu = assistantInput.includes("@");
  const showSlashCommandMenu = trimmedAssistantInput.startsWith("/") && !assistantInput.includes(" ");
  const isAssistantInputCommandOnly = trimmedAssistantInput === "@" || trimmedAssistantInput === "/";
  const fundReminderActive = isFundReminderActive(currentTime);

  return (
    <main className="appRoot">
      <header className="topNav">
        {fundReminderActive ? (
          <div className="fundReminderTopBar" role="status" aria-live="polite">
            <div className="fundReminderViewport">
              <div className="fundReminderTrack">
                <span>Pay attention to the timing of fund transactions</span>
                <span aria-hidden="true">Pay attention to the timing of fund transactions</span>
                <span aria-hidden="true">Pay attention to the timing of fund transactions</span>
              </div>
            </div>
          </div>
        ) : null}
        <div className="topNavInner">
          <div className="logoMark infoRadarLogo" aria-label="AICron - AI Information Cron">
            <span className="logoRadarSymbol" aria-hidden="true" />
            <span>AICron</span>
          </div>
          <div className="topSearch" ref={topSearchRef}>
            <div className="topSearchInputWrap">
              <Search size={16} aria-hidden="true" />
              <input
                aria-label="搜索文章或代码库标题"
                value={searchQuery}
                onChange={(event) => handleSearchQueryChange(event.target.value)}
                onFocus={() => {
                  if (searchQuery.trim()) setSearchOpen(true);
                }}
                placeholder="搜索标题"
                spellCheck={false}
              />
              {searchQuery ? (
                <button
                  className="topSearchClear"
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSearchPage(1);
                    setSearchOpen(false);
                  }}
                  aria-label="清空搜索"
                >
                  <X size={14} />
                </button>
              ) : null}
            </div>
            {searchOpen && searchQuery.trim() ? (
              <div className="topSearchResults" role="listbox" aria-label="搜索结果">
                {searchLoading ? <div className="topSearchStatus">搜索中</div> : null}
                {!searchLoading && searchData.items.length === 0 ? (
                  <div className="topSearchStatus">没有匹配标题</div>
                ) : null}
                {!searchLoading
                  ? searchData.items.map((item) => (
                      <button
                        key={item.id}
                        className="topSearchResultButton"
                        type="button"
                        role="option"
                        onPointerDown={(event) => handleSearchResultPointerDown(event, item)}
                        onKeyDown={(event) => handleSearchResultKeyDown(event, item)}
                        title={normalizeInlineMarkdownText(item.title)}
                      >
                        <InlineCardMarkdown content={item.title} />
                      </button>
                    ))
                  : null}
                {!searchLoading && searchData.pagination.total > 0 ? (
                  <div className="topSearchPager">
                    <button
                      type="button"
                      onClick={() => goToSearchPage(searchData.pagination.page - 1)}
                      disabled={!searchData.pagination.hasPrevious}
                    >
                      上一页
                    </button>
                    <span>
                      {searchData.pagination.page} / {searchData.pagination.totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => goToSearchPage(searchData.pagination.page + 1)}
                      disabled={!searchData.pagination.hasNext}
                    >
                      下一页
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <div className={cornerActionsOpen ? "cornerActionDock open" : "cornerActionDock"} ref={cornerActionDockRef}>
        <button
          className={unreadOnly ? "cornerActionTrigger active" : "cornerActionTrigger"}
          onClick={() => setCornerActionsOpen((value) => !value)}
          title="快捷操作"
          aria-label="快捷操作"
          aria-expanded={cornerActionsOpen}
          type="button"
        >
          <span className="cornerActionBadge">N</span>
        </button>
        <div className="cornerActionMenu" aria-label="快捷操作选项" aria-hidden={!cornerActionsOpen}>
          <div className="cornerActionMenuHead" aria-hidden="true">
            <span className="cornerActionMenuBadge">N</span>
            <span className="cornerActionMenuMeta">
              <strong>AICron</strong>
              <small>Local</small>
            </span>
            <ChevronRight size={16} />
          </div>
          <div className="cornerActionDivider" />
          <button
            className="cornerActionButton"
            onClick={() => {
              void refresh();
              setCornerActionsOpen(false);
            }}
            disabled={refreshing}
            title="刷新"
            tabIndex={cornerActionsOpen ? 0 : -1}
          >
            <RefreshCcw size={17} className={refreshing ? "spin" : ""} />
            <span>刷新</span>
          </button>
          <button
            className={unreadOnly ? "cornerActionButton active" : "cornerActionButton"}
            onClick={() => {
              setUnreadOnly((value) => !value);
              setPage(1);
              clearSelection();
              setCornerActionsOpen(false);
            }}
            title="只看未读"
            aria-pressed={unreadOnly}
            tabIndex={cornerActionsOpen ? 0 : -1}
          >
            <Check size={17} />
            <span>只看未读</span>
          </button>
        </div>
      </div>

      <div className={selectedItem ? "pageShell hasReader" : "pageShell"}>
        <aside className="leftRail">
          <section className="railBlock navRail">
            {NAV_SECTIONS.map((navItem) => {
              const expanded = expandedSections[navItem.id];
              const hasChildren = navSectionHasChildren(navItem.id);
              return (
                <div className="railGroup" key={navItem.id}>
                  <button
                    className={section === navItem.id ? "railNavItem active" : "railNavItem"}
                    onClick={() => switchSection(navItem.id)}
                  >
                    <span>{navItem.label}</span>
                    {hasChildren ? expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} /> : null}
                  </button>
                  {expanded && navItem.id === "vendors" ? (
                    <div className="railSubTree">
                      {VENDOR_TIERS.map((tier) => (
                        <div className="railTier" key={tier.label}>
                          <button
                            className={
                              aggregateScopeId === `vendors:${tier.id}`
                                ? "railSubItem railSubWithChevron railTierButton active"
                                : "railSubItem railSubWithChevron railTierButton"
                            }
                            onClick={() => {
                              setSection("vendors");
                              setAggregateScopeId(`vendors:${tier.id}`);
                              setVendorSource(null);
                              setCodingSource("all");
                              setPage(1);
                              clearSelection();
                              setVendorTierExpanded((current) => ({
                                ...current,
                                [tier.id]: !current[tier.id]
                              }));
                            }}
                          >
                            <span>{tier.label}</span>
                            {vendorTierExpanded[tier.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                          {vendorTierExpanded[tier.id] ? (
                            <div className="railNestedTree railVendorTierTree">
                              {tier.vendors.map((vendor) => {
                                const isQwen = vendor === "Qwen";
                                return (
                                  <div className={isQwen ? "railVendorNode" : undefined} key={vendor}>
                                    <button
                                      className={
                                        section === "vendors" && vendorFilter === vendor && !vendorSource
                                          ? isQwen
                                            ? "railSubItem railSubWithChevron railNestedItem active"
                                            : "railSubItem railNestedItem active"
                                          : isQwen
                                            ? "railSubItem railSubWithChevron railNestedItem"
                                            : "railSubItem railNestedItem"
                                      }
                                      onClick={() => {
                                        setSection("vendors");
                                        setVendorFilter(vendor);
                                        setVendorSource(null);
                                        if (isQwen) {
                                          setAggregateScopeId("vendors:qwen");
                                          setQwenExpanded((current) => !current);
                                        } else {
                                          setAggregateScopeId(null);
                                          setQwenExpanded(false);
                                        }
                                        setPage(1);
                                        clearSelection();
                                      }}
                                    >
                                      <span>{vendor}</span>
                                      {isQwen ? qwenExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} /> : null}
                                    </button>
                                    {isQwen && qwenExpanded ? (
                                      <div className="railNestedTree railDeepNestedTree">
                                        {QWEN_BRANCHES.map((branch) => (
                                          <button
                                            key={branch.id}
                                            className={
                                              section === "vendors" && vendorFilter === "Qwen" && vendorSource === branch.id
                                                ? "railSubItem railNestedItem active"
                                                : "railSubItem railNestedItem"
                                            }
                                            title={branch.description}
                                            onClick={() => {
                                              setSection("vendors");
                                              setVendorFilter("Qwen");
                                              setVendorSource(branch.id);
                                              setAggregateScopeId(null);
                                              setQwenExpanded(true);
                                              setPage(1);
                                              clearSelection();
                                            }}
                                          >
                                            {branch.label}
                                          </button>
                                        ))}
                                      </div>
                                    ) : null}
                                  </div>
                                );
                              })}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {expanded && navItem.id === "papers" ? (
                    <div className="railSubTree">
                      <div className="railVendorNode">
                        <button
                          className={
                            section === "papers" &&
                            (aggregateScopeId === "papers:huggingface" ||
                              HUGGINGFACE_PAPER_BRANCHES.some((branch) => branch.id === paperSource))
                              ? "railSubItem railSubWithChevron active"
                              : "railSubItem railSubWithChevron"
                          }
                          onClick={() => {
                            setSection("papers");
                            setVendorSource(null);
                            setCodingSource("all");
                            setPaperSource("all");
                            setAggregateScopeId("papers:huggingface");
                            setHuggingFaceExpanded((current) => !current);
                            setArxivExpanded(false);
                            setOpenReviewExpanded(false);
                            setPage(1);
                            clearSelection();
                          }}
                        >
                          <span>HuggingFace</span>
                          {huggingFaceExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                        {huggingFaceExpanded ? (
                          <div className="railNestedTree">
                            {HUGGINGFACE_PAPER_BRANCHES.map((branch) => (
                              <button
                                key={branch.id}
                                className={
                                  section === "papers" && paperSource === branch.id
                                    ? "railSubItem railNestedItem active"
                                    : "railSubItem railNestedItem"
                                }
                                title={branch.description}
                                onClick={() => {
                                  setSection("papers");
                                  setVendorSource(null);
                                  setCodingSource("all");
                                  setPaperSource(branch.id);
                                  setAggregateScopeId(null);
                                  setHuggingFaceExpanded(true);
                                  setArxivExpanded(false);
                                  setOpenReviewExpanded(false);
                                  setPage(1);
                                  clearSelection();
                                }}
                              >
                                {branch.label}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                      <div className="railVendorNode">
                        <button
                          className={
                            section === "papers" &&
                            (aggregateScopeId === "papers:arxiv" ||
                              ARXIV_PAPER_BRANCHES.some((branch) => branch.id === paperSource))
                              ? "railSubItem railSubWithChevron active"
                              : "railSubItem railSubWithChevron"
                          }
                          onClick={() => {
                            setSection("papers");
                            setVendorSource(null);
                            setCodingSource("all");
                            setPaperSource("all");
                            setAggregateScopeId("papers:arxiv");
                            setHuggingFaceExpanded(false);
                            setArxivExpanded((current) => !current);
                            setOpenReviewExpanded(false);
                            setPage(1);
                            clearSelection();
                          }}
                        >
                          <span>arXiv</span>
                          {arxivExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                        {arxivExpanded ? (
                          <div className="railNestedTree">
                            {ARXIV_PAPER_BRANCHES.map((branch) => (
                              <button
                                key={branch.id}
                                className={
                                  section === "papers" && paperSource === branch.id
                                    ? "railSubItem railNestedItem active"
                                    : "railSubItem railNestedItem"
                                }
                                title={`arXiv · ${branch.description}`}
                                onClick={() => {
                                  setSection("papers");
                                  setVendorSource(null);
                                  setCodingSource("all");
                                  setPaperSource(branch.id);
                                  setAggregateScopeId(null);
                                  setHuggingFaceExpanded(false);
                                  setArxivExpanded(true);
                                  setOpenReviewExpanded(false);
                                  setPage(1);
                                  clearSelection();
                                }}
                              >
                                {branch.label}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                      <div className="railVendorNode">
                        <button
                          className={
                            section === "papers" &&
                            (aggregateScopeId === "papers:openreview" ||
                              OPENREVIEW_CONFERENCE_BRANCHES.some((branch) => branch.id === paperSource))
                              ? "railSubItem railSubWithChevron active"
                              : "railSubItem railSubWithChevron"
                          }
                          onClick={() => {
                            setSection("papers");
                            setVendorSource(null);
                            setCodingSource("all");
                            setPaperSource("all");
                            setAggregateScopeId("papers:openreview");
                            setHuggingFaceExpanded(false);
                            setArxivExpanded(false);
                            setOpenReviewExpanded((current) => !current);
                            setPage(1);
                            clearSelection();
                          }}
                        >
                          <span>OpenReview</span>
                          {openReviewExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                        {openReviewExpanded ? (
                          <div className="railNestedTree">
                            {OPENREVIEW_CONFERENCE_BRANCHES.map((branch) => (
                              <button
                                key={branch.id}
                                className={
                                  section === "papers" && paperSource === branch.id
                                    ? "railSubItem railNestedItem active"
                                    : "railSubItem railNestedItem"
                                }
                                title={`OpenReview · ${branch.description}`}
                                onClick={() => {
                                  setSection("papers");
                                  setVendorSource(null);
                                  setCodingSource("all");
                                  setPaperSource(branch.id);
                                  setAggregateScopeId(null);
                                  setHuggingFaceExpanded(false);
                                  setArxivExpanded(false);
                                  setOpenReviewExpanded(true);
                                  setPage(1);
                                  clearSelection();
                                }}
                              >
                                {branch.label}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                  {expanded && navItem.id === "mathematics" ? (
                    <div className="railSubTree">
                      {MATHEMATICS_GROUPS.map((group) => {
                        const isGroupActive =
                          section === "mathematics" &&
                          (aggregateScopeId === group.aggregateScope ||
                            mathematicsGroupLeaves(group).some((branch) => branch.id === mathSource));
                        return (
                          <div className="railVendorNode" key={group.id}>
                            <button
                              className={
                                isGroupActive
                                  ? "railSubItem railSubWithChevron active"
                                  : "railSubItem railSubWithChevron"
                              }
                              title={group.description}
                              onClick={() => {
                                setSection("mathematics");
                                setVendorSource(null);
                                setCodingSource("all");
                                setPaperSource("all");
                                setMathSource("all");
                                setAggregateScopeId(group.aggregateScope);
                                setMathExpandedGroup((current) => (current === group.id ? null : group.id));
                                setMathExpandedSubgroup(null);
                                setPage(1);
                                clearSelection();
                              }}
                            >
                              <span>{group.label}</span>
                              {mathExpandedGroup === group.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>
                            {mathExpandedGroup === group.id ? (
                              <div className="railNestedTree">
                                {group.branches.map((branch) => {
                                  const hasChildren = Boolean(branch.children?.length);
                                  const isBranchActive =
                                    section === "mathematics" &&
                                    (aggregateScopeId === branch.aggregateScope ||
                                      mathematicsBranchLeaves(branch).some((leaf) => leaf.id === mathSource));
                                  if (hasChildren) {
                                    return (
                                      <div className="railVendorNode" key={branch.id}>
                                        <button
                                          className={
                                            isBranchActive
                                              ? "railSubItem railNestedItem railSubWithChevron active"
                                              : "railSubItem railNestedItem railSubWithChevron"
                                          }
                                          title={branch.description}
                                          onClick={() => {
                                            setSection("mathematics");
                                            setVendorSource(null);
                                            setCodingSource("all");
                                            setPaperSource("all");
                                            setMathSource("all");
                                            setAggregateScopeId(branch.aggregateScope ?? group.aggregateScope);
                                            setMathExpandedGroup(group.id);
                                            setMathExpandedSubgroup((current) =>
                                              current === branch.id ? null : branch.id
                                            );
                                            setPage(1);
                                            clearSelection();
                                          }}
                                        >
                                          <span>{branch.label}</span>
                                          {mathExpandedSubgroup === branch.id ? (
                                            <ChevronDown size={14} />
                                          ) : (
                                            <ChevronRight size={14} />
                                          )}
                                        </button>
                                        {mathExpandedSubgroup === branch.id ? (
                                          <div className="railNestedTree">
                                            {branch.children?.map((leaf) => (
                                              <button
                                                key={leaf.id}
                                                className={
                                                  section === "mathematics" && mathSource === leaf.id
                                                    ? "railSubItem railNestedItem active"
                                                    : "railSubItem railNestedItem"
                                                }
                                                title={leaf.description}
                                                onClick={() => {
                                                  setSection("mathematics");
                                                  setVendorSource(null);
                                                  setCodingSource("all");
                                                  setPaperSource("all");
                                                  setMathSource(leaf.id);
                                                  setAggregateScopeId(null);
                                                  setMathExpandedGroup(group.id);
                                                  setMathExpandedSubgroup(branch.id);
                                                  setPage(1);
                                                  clearSelection();
                                                }}
                                              >
                                                {leaf.label}
                                              </button>
                                            ))}
                                          </div>
                                        ) : null}
                                      </div>
                                    );
                                  }
                                  return (
                                    <button
                                      key={branch.id}
                                      className={
                                        section === "mathematics" && mathSource === branch.id
                                          ? "railSubItem railNestedItem active"
                                          : "railSubItem railNestedItem"
                                      }
                                      title={branch.description}
                                      onClick={() => {
                                        setSection("mathematics");
                                        setVendorSource(null);
                                        setCodingSource("all");
                                        setPaperSource("all");
                                        setMathSource(branch.id);
                                        setAggregateScopeId(null);
                                        setMathExpandedGroup(group.id);
                                        setMathExpandedSubgroup(null);
                                        setPage(1);
                                        clearSelection();
                                      }}
                                    >
                                      {branch.label}
                                    </button>
                                  );
                                })}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                  {expanded && navItem.id === "labs" ? (
                    <div className="railSubTree">
                      {AI_LAB_BRANCHES.map((branch) => (
                        <button
                          key={branch.id}
                          className={
                            section === "labs" && labSource === branch.id
                              ? "railSubItem railNestedItem active"
                              : "railSubItem railNestedItem"
                          }
                          title={branch.description}
                          onClick={() => {
                            setSection("labs");
                            setVendorSource(null);
                            setCodingSource("all");
                            setLabSource(branch.id);
                            setAggregateScopeId(null);
                            setPage(1);
                            clearSelection();
                          }}
                        >
                          {branch.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {expanded && navItem.id === "coding" ? (
                    <div className="railSubTree">
                      <div className="railVendorNode">
                        <button
                          className={
                            section === "coding" &&
                            (aggregateScopeId === "coding:codex" || CODEX_BRANCHES.some((branch) => branch.id === codingSource))
                              ? "railSubItem railSubWithChevron active"
                              : "railSubItem railSubWithChevron"
                          }
                          onClick={() => {
                            setSection("coding");
                            setVendorSource(null);
                            setCodingSource("all");
                            setAggregateScopeId("coding:codex");
                            setCodexExpanded((current) => !current);
                            setPage(1);
                            clearSelection();
                          }}
                        >
                          <span>Codex</span>
                          {codexExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                        {codexExpanded ? (
                          <div className="railNestedTree">
                            {CODEX_BRANCHES.map((branch) => (
                              <button
                                key={branch.id}
                                className={
                                  section === "coding" && codingSource === branch.id
                                    ? "railSubItem railNestedItem active"
                                    : "railSubItem railNestedItem"
                                }
                                title={branch.description}
                                onClick={() => {
                                  setSection("coding");
                                  setVendorSource(null);
                                  setCodingSource(branch.id);
                                  setAggregateScopeId(null);
                                  setCodexExpanded(true);
                                  setPage(1);
                                  clearSelection();
                                }}
                              >
                                {branch.label}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                      {CODING_SOURCES.map((item) => (
                        <button
                          key={item.id}
                          className={section === "coding" && codingSource === item.id ? "railSubItem active" : "railSubItem"}
                          onClick={() => {
                            setSection("coding");
                            setVendorSource(null);
                            setCodingSource(item.id);
                            setAggregateScopeId(null);
                            setCodexExpanded(false);
                            setPage(1);
                            clearSelection();
                          }}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </section>
          <OilPriceAmbient snapshot={oilPrice} offset={oilScrollOffset} onWheel={handleOilWheel} />
        </aside>

        <section
          className={`feedPanel ${isCoverflowMode ? "plazaPanel" : ""} ${
            section === "github" && !selectedItem ? "githubPanel" : ""
          }`}
        >
          {error ? <div className="errorLine">{error}</div> : null}
          {selectedItem ? (
            <article className="articleReader">
              <div className="articleReaderTop">
                <button onClick={clearSelection}>返回列表</button>
                <a className="articleOpenOriginal" href={selectedItem.canonicalUrl} target="_blank" rel="noreferrer">
                  <ExternalLink size={15} />
                  打开原文
                </a>
              </div>
              <div className="articleMeta">
                {selectedItem.isNewSinceBrief ? <span className="newBadge">新增</span> : null}
                <span>{selectedItem.vendor}</span>
                <span>{selectedItem.sourceName}</span>
                <span>{itemDateLabel(selectedItem)}</span>
              </div>
              <h1>
                <InlineMarkdown content={selectedItem.title} />
              </h1>
              <div className="tagRow articleTags">
                <span className={`importance i${selectedItem.importance}`}>优先级 {selectedItem.importance}</span>
                {selectedItem.tags.slice(0, 5).map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
              {selectedItem.summary ? (
                <section className="articleSummary">
                  <strong>摘要</strong>
                  <MarkdownBlock content={selectedItem.summary} />
                </section>
              ) : null}
              {detailLoadingId === selectedItem.id ? (
                <section className="articleNotice">
                  <strong>正在抓取正文</strong>
                  <p>正在从原文地址拉取可站内阅读的正文内容。</p>
                </section>
              ) : selectedRichHtml ? (
                <RichArticleHtml html={selectedRichHtml} />
              ) : selectedParagraphs.length > 0 ? (
                <section className="articleBody">
                  {selectedParagraphs.map((paragraph, index) => (
                    <MarkdownBlock key={`${selectedItem.id}-${index}`} content={paragraph} />
                  ))}
                </section>
              ) : (
                <section className="articleNotice">
                  <strong>未获取到完整正文</strong>
                  <p>
                    这个源没有在 RSS 中提供全文，本站抓取原文时也没有拿到可展示正文。上方只保留摘要用于快速判断，
                    需要阅读全文请点击“打开原文”。
                  </p>
                </section>
              )}
            </article>
          ) : (
            <>
              {!isCoverflowMode ? (
                <div className="feedHeader">
                  <div>
                    <h1>{headerCopy.title}</h1>
                    <p>{headerCopy.description}</p>
                  </div>
                  <span>{loading ? "加载中" : `${data.pagination.total} 条`}</span>
                </div>
              ) : null}

              <div
                className={
                  section === "github" ? "githubGrid" : isCoverflowMode ? "plazaCarousel" : "feedList"
                }
                onWheel={isCoverflowMode ? handlePlazaWheel : undefined}
                onPointerDown={isCoverflowMode ? handlePlazaPointerDown : undefined}
                onPointerMove={isCoverflowMode ? handlePlazaPointerMove : undefined}
                onPointerUp={isCoverflowMode ? handlePlazaPointerUp : undefined}
                onPointerCancel={isCoverflowMode ? handlePlazaPointerUp : undefined}
                aria-busy={loading}
              >
                {(isCoverflowMode ? plazaCards : data.items.map((item, index) => ({ item, index, pose: null }))).map(({ item, index, pose }) => (
                  section === "github" ? (
                    <article
                      key={item.id}
                      className="githubRepoCard"
                      onClick={() => void selectItem(item)}
                    >
                      <div className="githubRepoBody">
                        <div className="githubRepoTop">
                          <span className="githubRank">#{(data.pagination.page - 1) * data.pagination.pageSize + index + 1}</span>
                          {item.isNewSinceBrief ? <span className="newBadge">新增</span> : null}
                          <span className="githubLanguage">
                            <i style={{ background: githubLanguageColor(githubLanguage(item)) }} />
                            {githubLanguage(item)}
                          </span>
                        </div>
                        <h2>
                          <button
                            className="cardTextButton cardTitleButton"
                            type="button"
                            onPointerUp={(event) => handleCardTextOpen(event, item)}
                            onClick={(event) => handleCardTextOpen(event, item)}
                            onKeyDown={(event) => handleCardTextKeyDown(event, item)}
                          >
                            <InlineCardMarkdown content={item.title} />
                          </button>
                        </h2>
                        <div className="githubDescription">
                          <button
                            className="cardTextButton cardSummaryButton"
                            type="button"
                            onPointerUp={(event) => handleCardTextOpen(event, item)}
                            onClick={(event) => handleCardTextOpen(event, item)}
                            onKeyDown={(event) => handleCardTextKeyDown(event, item)}
                          >
                            <InlineCardMarkdown content={githubDescription(item)} />
                          </button>
                        </div>
                        <div className="githubStats">
                          <span>
                            <strong>{githubMetric(item, "Stars")}</strong>
                            <em>Stars</em>
                          </span>
                          <span>
                            <strong>{githubMetric(item, "Forks")}</strong>
                            <em>Forks</em>
                          </span>
                          <span>
                            <strong>{githubTodayLabel(item)}</strong>
                            <em>Today</em>
                          </span>
                        </div>
                        <div className="githubActions">
                          <a
                            href={item.canonicalUrl}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <ExternalLink size={14} />
                            仓库
                          </a>
                          <button onClick={(event) => { event.stopPropagation(); void toggleStar(item); }}>
                            <Star size={14} fill={item.starred ? "currentColor" : "none"} />
                            收藏
                          </button>
                        </div>
                      </div>
                      <div className="githubTodayRail" aria-label={`${githubTodayLabel(item)} stars today`}>
                        <div className="githubTodayTrack">
                          <i style={{ height: `${Math.max(5, Math.round((githubTodayCount(item) / maxGithubToday) * 100))}%` }} />
                        </div>
                      </div>
                    </article>
                  ) : isCoverflowMode ? (
                    <article
                      key={item.id}
                      data-plaza-item-id={item.id}
                      className={`plazaCard ${plazaToneClass(item)} ${data.items.length > 1 ? "plazaCardInertia" : "plazaCardSingle"}`}
                      style={
                        pose
                          ? ({
                              opacity: pose.opacity,
                              zIndex: pose.zIndex,
                              transform: `translate(-50%, -50%) translateX(${pose.x}px) translateY(${pose.y}px) translateZ(${pose.z}px) rotateY(${pose.rotateY}deg) scale(${pose.scale})`
                            } as CSSProperties)
                          : undefined
                      }
                    >
                      <div className="plazaCover">
                        <div className="plazaCoverTop">
                          <span>{item.vendor}</span>
                          {item.isNewSinceBrief ? <span className="newBadge">新增</span> : null}
                          {isTodayItem(item) ? <TodayBadge /> : null}
                          <span>{item.sourceName}</span>
                        </div>
                        <h2>
                          <button
                            className="cardTextButton cardTitleButton"
                            type="button"
                            onPointerUp={(event) => handleCardTextOpen(event, item)}
                            onClick={(event) => handleCardTextOpen(event, item)}
                            onKeyDown={(event) => handleCardTextKeyDown(event, item)}
                          >
                            <InlineCardMarkdown content={item.title} />
                          </button>
                        </h2>
                        <p>{itemDateLabel(item)}</p>
                      </div>
                      <div className="plazaCardBody">
                        <div className="plazaMeta">
                          <span>{plazaSourceLabel(item)}</span>
                          <span className={`importance i${item.importance}`}>优先级 {item.importance}</span>
                        </div>
                        {selectListTeaserText(item) ? (
                          <div className="plazaSummary">
                            <button
                              className="cardTextButton cardSummaryButton"
                              type="button"
                              onPointerUp={(event) => handleCardTextOpen(event, item)}
                              onClick={(event) => handleCardTextOpen(event, item)}
                              onKeyDown={(event) => handleCardTextKeyDown(event, item)}
                            >
                              <InlineCardMarkdown content={selectListTeaserText(item)} />
                            </button>
                          </div>
                        ) : null}
                        <div className="plazaActions">
                          <a
                            href={item.canonicalUrl}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <ExternalLink size={14} />
                            原文
                          </a>
                          <button onClick={(event) => { event.stopPropagation(); void toggleStar(item); }}>
                            <Star size={14} fill={item.starred ? "currentColor" : "none"} />
                            收藏
                          </button>
                        </div>
                      </div>
                    </article>
                  ) : (
                    <article
                      key={item.id}
                      className={selectedId === item.id ? "feedItem selected" : "feedItem"}
                      onClick={() => void selectItem(item)}
                    >
                      <div className="feedMeta">
                        {item.isNewSinceBrief ? <span className="newBadge">新增</span> : null}
                        <span>{item.vendor}</span>
                        <span>{item.sourceName}</span>
                        <span>{itemDateLabel(item)}</span>
                        {isTodayItem(item) ? <TodayBadge /> : null}
                      </div>
                      <h2>
                        <button
                          className="cardTextButton cardTitleButton"
                          type="button"
                          onPointerUp={(event) => handleCardTextOpen(event, item)}
                          onClick={(event) => handleCardTextOpen(event, item)}
                          onKeyDown={(event) => handleCardTextKeyDown(event, item)}
                        >
                          <InlineCardMarkdown content={item.title} />
                        </button>
                      </h2>
                      {selectListTeaserText(item) ? (
                        <div className="feedSummary">
                          <button
                            className="cardTextButton cardSummaryButton"
                            type="button"
                            onPointerUp={(event) => handleCardTextOpen(event, item)}
                            onClick={(event) => handleCardTextOpen(event, item)}
                            onKeyDown={(event) => handleCardTextKeyDown(event, item)}
                          >
                            <InlineCardMarkdown content={selectListTeaserText(item)} />
                          </button>
                        </div>
                      ) : null}
                      <div className="feedFooter">
                        <div className="tagRow">
                          <span className={`importance i${item.importance}`}>优先级 {item.importance}</span>
                          {item.tags.slice(0, 3).map((tag) => (
                            <span key={tag}>{tag}</span>
                          ))}
                        </div>
                        <div className="quickActions">
                          <a
                            href={item.canonicalUrl}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <ExternalLink size={14} />
                            原文
                          </a>
                          <button onClick={(event) => { event.stopPropagation(); void toggleStar(item); }}>
                            <Star size={14} fill={item.starred ? "currentColor" : "none"} />
                            收藏
                          </button>
                          <button onClick={(event) => { event.stopPropagation(); void toggleRead(item); }}>
                            <Check size={14} />
                            {item.readAt ? "已读" : "标记已读"}
                          </button>
                        </div>
                      </div>
                    </article>
                  )
                ))}
                {!loading && data.items.length === 0 ? (
                <div className="emptyState">
                  <h2>没有匹配内容</h2>
                    <p>点击左下角 N 菜单中的刷新获取最新源。</p>
                </div>
                ) : null}
              </div>

              {isCoverflowMode && data.items.length > 1 ? (
                <div className="plazaControls">
                  <button onClick={() => scrollPlaza("previous")} disabled={loading} title="向左滑动">
                    <ArrowLeft size={15} />
                    上一张
                  </button>
                  <button onClick={() => scrollPlaza("next")} disabled={loading} title="向右滑动">
                    下一张
                    <ArrowRight size={15} />
                  </button>
                </div>
              ) : null}

              {!isCoverflowMode ? (
              <div className="paginationBar">
                <button
                  onClick={() => goToPage(data.pagination.page - 1)}
                  disabled={!data.pagination.hasPrevious || loading}
                >
                  上一页
                </button>
                <span>
                  第 {data.pagination.page} / {data.pagination.totalPages} 页 · 每页 {data.pagination.pageSize} 条 · 共{" "}
                  {data.pagination.total} 条
                </span>
                <form className="paginationJump" onSubmit={handlePageJumpSubmit}>
                  <input
                    aria-label="跳转页码"
                    type="number"
                    min={1}
                    max={data.pagination.totalPages}
                    inputMode="numeric"
                    value={pageJumpValue}
                    onChange={(event) => setPageJumpValue(event.target.value)}
                    disabled={loading || data.pagination.totalPages <= 1}
                    placeholder="页码"
                  />
                  <button type="submit" disabled={loading || data.pagination.totalPages <= 1 || !pageJumpValue.trim()}>
                    跳转
                  </button>
                </form>
                <button
                  onClick={() => goToPage(data.pagination.page + 1)}
                  disabled={!data.pagination.hasNext || loading}
                >
                  下一页
                </button>
              </div>
              ) : null}
            </>
          )}
        </section>

        {selectedItem ? (
        <aside className="rightRail">
          <section className="juejinCard readerPanel chatOnlyPanel" aria-label="Codex 文章对话">
            <button className="iconButton chatCloseButton" onClick={clearSelection} title="关闭助手">
              <X size={16} />
            </button>
            <div className="assistantPanel">
              <div className="messageList">
                {messages.map((message, index) => (
                  <div key={`${message.role}-${index}`} className={`message ${message.role}`}>
                    {message.role === "assistant" ? <MarkdownMessage content={message.content} /> : message.content}
                  </div>
                ))}
                {messages.length === 0 ? (
                  <div className="message muted">直接输入问题，Codex 会基于当前文章内容回答。</div>
                ) : null}
              </div>
              {showPromptMenu ? (
                <div className="mentionPromptMenu" aria-label="快捷提示词">
                  {PRESET_PROMPTS.map((prompt) => (
                    <button
                      key={prompt.id}
                      onClick={() => void askCodex(prompt.prompt, prompt.label)}
                      disabled={codexBusy}
                    >
                      {prompt.label}
                    </button>
                  ))}
                </div>
              ) : null}
              {showSlashCommandMenu ? (
                <div className="mentionPromptMenu" aria-label="Slash 快捷命令">
                  {SLASH_COMMANDS.map((command) => (
                    <button
                      key={command.id}
                      onPointerDown={(event) => {
                        event.preventDefault();
                        setAssistantInput(command.command);
                      }}
                      disabled={codexBusy}
                      title={command.description}
                    >
                      {command.label}
                    </button>
                  ))}
                </div>
              ) : null}
              <div className="askRow">
                <textarea
                  value={assistantInput}
                  onChange={(event) => setAssistantInput(event.target.value)}
                  placeholder="输入 @ 选择快捷问题，输入 / 选择联网搜索，或直接追问"
                  rows={2}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey && !isAssistantInputCommandOnly) {
                      if (event.nativeEvent.isComposing) return;
                      event.preventDefault();
                      void askCodex(assistantInput);
                    }
                  }}
                />
                <button
                  className="iconButton strong"
                  onClick={() => void askCodex(assistantInput)}
                  disabled={codexBusy || isAssistantInputCommandOnly}
                  title="发给 Codex"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </section>
        </aside>
        ) : null}
      </div>
    </main>
  );
}

function navSectionHasChildren(section: NavSectionId): boolean {
  return section === "papers" || section === "mathematics" || section === "labs" || section === "vendors" || section === "coding";
}

function githubDescription(item: StoredItem): string {
  return githubText(item).split(" · ")[0] || "GitHub Trending 当前热榜项目。";
}

function plazaSourceLabel(item: StoredItem): string {
  if (item.sourceId === "openai-codex-blog") return "Codex / Blog";
  if (item.sourceId === "openai-codex-changelog") return "Codex / Changelog";
  if (item.sourceId === "qwen-blog-rss") return "Qwen / Blog";
  if (item.sourceId === "qwen-research") return "Qwen / Research";
  if (item.sourceId === "kimi-blog") return "Kimi / Blog";
  if (item.sourceId === "huggingface-daily-papers") return "HF / Daily Papers";
  if (item.sourceId === "huggingface-trending-papers") return "HF / Trending Papers";
  if (ARXIV_SOURCE_LABELS.has(item.sourceId)) return ARXIV_SOURCE_LABELS.get(item.sourceId) as string;
  if (OPENREVIEW_SOURCE_LABELS.has(item.sourceId)) return OPENREVIEW_SOURCE_LABELS.get(item.sourceId) as string;
  if (item.sourceId === "stanford-ai-lab-blog") return "Stanford AI Lab";
  if (item.sourceId === "bair-blog") return "BAIR";
  if (item.sourceId === "cmu-ml-blog") return "CMU ML";
  if (item.sourceId === "mila-blog") return "Mila";
  if (item.sourceId === "vector-publications") return "Vector Institute";
  if (item.sourceId === "claude-blog-posts") return "Claude Code";
  return item.vendor;
}

function itemDateLabel(item: StoredItem): string {
  return formatItemDateLabel(item);
}

function isTodayItem(item: StoredItem): boolean {
  return isCurrentLocalItemDate(item);
}

function TodayBadge() {
  return (
    <span className="todayBadge" title="今日文章" aria-label="今日文章">
      <i className="todayBadgeDot" aria-hidden="true" />
      今日
    </span>
  );
}

function plazaToneClass(item: StoredItem): string {
  const tones: Record<string, string> = {
    OpenAI: "toneOpenAI",
    Anthropic: "toneAnthropic",
    Qwen: "toneQwen",
    Kimi: "toneKimi",
    HuggingFace: "toneHuggingFace",
    arXiv: "toneOpenReview",
    OpenReview: "toneOpenReview",
    BAIR: "toneOpenReview",
    "CMU ML": "toneOpenReview",
    Mila: "toneOpenReview",
    "Vector Institute": "toneOpenReview",
    MiniMax: "toneMiniMax",
    ZhipuAI: "toneZhipuAI"
  };
  return tones[item.vendor] ?? "toneDefault";
}

function normalizeIndex(index: number, total: number): number {
  if (total <= 0) return 0;
  return ((index % total) + total) % total;
}

function plazaCoverPose(index: number, phase: number, total: number, viewportWidth: number) {
  if (total <= 1) {
    return {
      x: 0,
      y: 0,
      z: 118,
      scale: 1.08,
      opacity: 1,
      rotateY: 0,
      zIndex: 7
    };
  }

  const layout = plazaLayoutForWidth(viewportWidth);
  const raw = index / total - phase;
  const wrapped = ((raw + 0.5) % 1 + 1) % 1 - 0.5;
  const slot = wrapped * total;
  const abs = Math.abs(slot);
  const sign = Math.sign(slot);
  const clamped = Math.min(abs, 3);
  const x = sign * interpolate(clamped, [0, 1, 2, 3], [0, layout.nearX, layout.farX, 0]);
  const y = interpolate(clamped, [0, 1, 2, 3], [0, 10, 18, 28]);
  const z = interpolate(clamped, [0, 1, 2, 3], [118, 14, -92, -280]);
  const scale = interpolate(clamped, [0, 1, 2, 3], [layout.centerScale, layout.nearScale, layout.farScale, 0.52]);
  const opacity = interpolate(clamped, [0, 1, 2, 3], [1, 0.9, 0.55, 0.16]);
  const rotateY = sign * interpolate(clamped, [0, 1, 2, 3], [0, -13, -21, 0]);

  return {
    x,
    y,
    z,
    scale,
    opacity,
    rotateY,
    zIndex: Math.max(1, Math.round(8 - abs * 2))
  };
}

function plazaLayoutForWidth(viewportWidth: number) {
  if (viewportWidth <= 820) {
    return {
      centerScale: 1,
      nearX: 160,
      farX: 252,
      nearScale: 0.68,
      farScale: 0.46
    };
  }
  if (viewportWidth <= 1120) {
    return {
      centerScale: 1.08,
      nearX: 232,
      farX: 370,
      nearScale: 0.78,
      farScale: 0.54
    };
  }
  return {
    centerScale: 1.08,
    nearX: 280,
    farX: 486,
    nearScale: 0.82,
    farScale: 0.6
  };
}

function horizontalWheelDelta(event: ReactWheelEvent<HTMLElement>) {
  if (Math.abs(event.deltaX) >= 1) return event.deltaX;
  if (event.shiftKey && Math.abs(event.deltaY) >= 1) return event.deltaY;
  return 0;
}

function easePlazaTowardNearestSlot(phase: number, total: number, amount: number) {
  if (total <= 1) return normalizePhase(phase);
  const step = 1 / total;
  const target = normalizePhase(Math.round(phase / step) * step);
  let delta = target - phase;
  if (delta > 0.5) delta -= 1;
  if (delta < -0.5) delta += 1;
  return normalizePhase(phase + delta * amount);
}

function snapPlazaToNearestSlot(phase: number, total: number) {
  if (total <= 1) return normalizePhase(phase);
  const step = 1 / total;
  return normalizePhase(Math.round(phase / step) * step);
}

function plazaDistanceToNearestSlot(phase: number, total: number) {
  if (total <= 1) return 0;
  const target = snapPlazaToNearestSlot(phase, total);
  const direct = Math.abs(target - phase);
  return Math.min(direct, 1 - direct);
}

function interpolate(value: number, input: number[], output: number[]) {
  for (let index = 0; index < input.length - 1; index += 1) {
    const start = input[index] ?? 0;
    const end = input[index + 1] ?? start;
    if (value >= start && value <= end) {
      const progress = end === start ? 0 : (value - start) / (end - start);
      return (output[index] ?? 0) + progress * ((output[index + 1] ?? 0) - (output[index] ?? 0));
    }
  }
  return output[output.length - 1] ?? 0;
}

function normalizePhase(value: number) {
  return ((value % 1) + 1) % 1;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function githubLanguage(item: StoredItem): string {
  return matchGithubText(item, /语言：([^·\n]+)/) || "Unknown";
}

function githubMetric(item: StoredItem, label: "Stars" | "Forks"): string {
  return matchGithubText(item, new RegExp(`${label}：([^·\\n]+)`)) || "0";
}

function githubTodayLabel(item: StoredItem): string {
  return matchGithubText(item, /([\d,]+\s+stars today)/i)?.replace(/\s+stars today/i, "") || "0";
}

function githubTodayCount(item: StoredItem): number {
  return Number(githubTodayLabel(item).replaceAll(",", "")) || 0;
}

function matchGithubText(item: StoredItem, pattern: RegExp): string | null {
  return githubText(item).match(pattern)?.[1]?.trim() ?? null;
}

function githubText(item: StoredItem): string {
  return [item.summary, item.excerpt, item.content].filter(Boolean).join(" · ");
}

function githubLanguageColor(language: string): string {
  const colors: Record<string, string> = {
    TypeScript: "#3178c6",
    JavaScript: "#d7ba00",
    Python: "#3572a5",
    Rust: "#dea584",
    Go: "#00add8",
    Shell: "#89e051",
    C: "#555555",
    "C++": "#f34b7d"
  };
  return colors[language] ?? "#6f7681";
}

function OilPriceAmbient({
  snapshot,
  offset,
  onWheel
}: {
  snapshot: OilPriceResponse | null;
  offset: number;
  onWheel: (event: ReactWheelEvent<HTMLElement>) => void;
}) {
  const rows = snapshot?.items ?? [];
  return (
    <section className="sideOilAmbient" aria-label="上海油价" onWheel={onWheel} title="触摸板上下滑动可控制油价滚动">
      <div className="sideOilHead">
        <span>上海油价</span>
        <time>{snapshot?.updatedAt ?? "较上期"}</time>
      </div>
      {rows.length > 0 ? (
        <div className="oilVerticalTickerWindow">
          <div className="oilVerticalTickerTrack" style={{ transform: `translateY(-${offset}px)` }}>
            <OilPriceRows rows={rows} />
            <OilPriceRows rows={rows} />
          </div>
        </div>
      ) : (
        <p className="sideOilUnavailable">{snapshot?.error ?? "油价加载中"}</p>
      )}
    </section>
  );
}

function OilPriceRows({ rows }: { rows: OilPriceItem[] }) {
  return (
    <div className="oilPriceRows">
      {rows.map((item) => (
        <div className="oilPriceRow" key={item.label}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          <em className={`oilDelta ${oilDeltaToneClass(item.tone)}`}>{formatOilDelta(item)}</em>
        </div>
      ))}
    </div>
  );
}

function normalizeOilScroll(value: number): number {
  return ((value % OIL_SCROLL_LOOP_PX) + OIL_SCROLL_LOOP_PX) % OIL_SCROLL_LOOP_PX;
}

function formatOilDelta(item: OilPriceItem): string {
  if (!item.delta) return "--";
  const cleanDelta = item.delta.replace(/^[+-]\s*/, "").replace(/~\s*[+-]/g, "~");
  if (item.tone === "up") return `↑ ${cleanDelta}`;
  if (item.tone === "down") return `↓ ${cleanDelta}`;
  return cleanDelta;
}

function oilDeltaToneClass(tone: OilPriceItem["tone"]): string {
  if (tone === "up") return "up";
  if (tone === "down") return "down";
  if (tone === "flat") return "flat";
  return "unknown";
}

function articleParagraphs(item: StoredItem): string[] {
  if (!hasDisplayableArticleContent(item)) return [];
  if (decodeRichHtmlContent(item.content)) return [];
  const raw = richContentToText(item.content);
  const cleaned = raw.replace(/\s+/g, " ").trim();
  if (!cleaned) return [];

  const sentences = cleaned.match(/[^。！？.!?]+[。！？.!?]?/g) ?? [cleaned];
  const paragraphs: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    const next = `${current}${sentence}`.trim();
    if (next.length > 260 && current) {
      paragraphs.push(current.trim());
      current = sentence.trim();
    } else {
      current = next;
    }
  }

  if (current) paragraphs.push(current.trim());
  return paragraphs.slice(0, 24);
}

function RichArticleHtml({ html }: { html: string }) {
  return <section className="articleBody richArticleBody" dangerouslySetInnerHTML={{ __html: renderMathInRichHtml(html) }} />;
}

function InlineMarkdown({ content }: { content: string }) {
  return (
    <span className="inlineRichText">
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex]}
        components={{
          p: ({ children }) => <span>{children}</span>,
          a: ({ children, ...props }) => (
            <a {...props} target="_blank" rel="noreferrer">
              {children}
            </a>
          )
        }}
      >
        {normalizeInlineMarkdownText(content)}
      </ReactMarkdown>
    </span>
  );
}

function InlineCardMarkdown({ content }: { content: string }) {
  return (
    <span className="inlineRichText">
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex]}
        components={{
          p: ({ children }) => <span>{children}</span>,
          a: ({ children }) => <span className="inlineCardLinkText">{children}</span>
        }}
      >
        {normalizeInlineMarkdownText(content)}
      </ReactMarkdown>
    </span>
  );
}

function MarkdownBlock({ content }: { content: string }) {
  return (
    <div className="richTextBlock">
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex]}
        components={{
          a: ({ children, ...props }) => (
            <a {...props} target="_blank" rel="noreferrer">
              {children}
            </a>
          )
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function MarkdownMessage({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkMath, remarkGfm]}
      rehypePlugins={[rehypeKatex]}
      components={{
        a: ({ children, ...props }) => (
          <a {...props} target="_blank" rel="noreferrer">
            {children}
          </a>
        )
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
