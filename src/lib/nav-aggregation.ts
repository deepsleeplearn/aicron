import { itemSortTimestamp } from "./date-format";
import { compareHuggingFacePreviewItems } from "./huggingface-display";
import type { StoredItem } from "./types";

export type AggregateLeafGroup = {
  id: string;
  label: string;
  sourceIds: string[];
};

export type AggregateNavScope = {
  id: string;
  label: string;
  perLeaf: number;
  leafGroups: AggregateLeafGroup[];
};

export const VENDOR_LEAF_GROUPS: AggregateLeafGroup[] = [
  { id: "anthropic", label: "Anthropic", sourceIds: ["anthropic-research"] },
  { id: "openai", label: "OpenAI", sourceIds: ["openai-research-index"] },
  { id: "qwen-blog", label: "Qwen / Blog", sourceIds: ["qwen-blog-rss"] },
  { id: "qwen-research", label: "Qwen / Research", sourceIds: ["qwen-research"] },
  { id: "kimi", label: "Kimi", sourceIds: ["kimi-blog"] },
  { id: "minimax", label: "MiniMax", sourceIds: ["minimax-blog"] },
  { id: "zhipu", label: "ZhipuAI", sourceIds: ["zhipu-model-family"] }
];

export const CODING_LEAF_GROUPS: AggregateLeafGroup[] = [
  { id: "codex-blog", label: "Codex / Blog", sourceIds: ["openai-codex-blog"] },
  { id: "codex-changelog", label: "Codex / Changelog", sourceIds: ["openai-codex-changelog"] },
  { id: "claude-code", label: "Claude Code", sourceIds: ["claude-blog-posts"] }
];

export const HUGGINGFACE_PAPER_LEAF_GROUPS: AggregateLeafGroup[] = [
  { id: "hf-daily-papers", label: "HuggingFace / Daily Papers", sourceIds: ["huggingface-daily-papers"] },
  { id: "hf-trending-papers", label: "HuggingFace / Trending Papers", sourceIds: ["huggingface-trending-papers"] }
];

export const ARXIV_PAPER_LEAF_GROUPS: AggregateLeafGroup[] = [
  { id: "arxiv-cs-ai", label: "arXiv / cs.AI", sourceIds: ["arxiv-cs-ai"] },
  { id: "arxiv-cs-lg", label: "arXiv / cs.LG", sourceIds: ["arxiv-cs-lg"] },
  { id: "arxiv-cs-cl", label: "arXiv / cs.CL", sourceIds: ["arxiv-cs-cl"] },
  { id: "arxiv-cs-cv", label: "arXiv / cs.CV", sourceIds: ["arxiv-cs-cv"] },
  { id: "arxiv-cs-ro", label: "arXiv / cs.RO", sourceIds: ["arxiv-cs-ro"] },
  { id: "arxiv-stat-ml", label: "arXiv / stat.ML", sourceIds: ["arxiv-stat-ml"] }
];

export const OPENREVIEW_PAPER_LEAF_GROUPS: AggregateLeafGroup[] = [
  { id: "openreview-iclr", label: "OpenReview / ICLR", sourceIds: ["openreview-iclr-2026"] },
  { id: "openreview-neurips", label: "OpenReview / NeurIPS", sourceIds: ["openreview-neurips-2025"] },
  { id: "openreview-icml", label: "OpenReview / ICML", sourceIds: ["openreview-icml-2025"] },
  { id: "openreview-colm", label: "OpenReview / COLM", sourceIds: ["openreview-colm-2025"] }
];

export const PAPER_LEAF_GROUPS: AggregateLeafGroup[] = [
  ...HUGGINGFACE_PAPER_LEAF_GROUPS,
  ...ARXIV_PAPER_LEAF_GROUPS,
  ...OPENREVIEW_PAPER_LEAF_GROUPS
];

export const LAB_LEAF_GROUPS: AggregateLeafGroup[] = [
  { id: "stanford-ai-lab", label: "Stanford AI Lab", sourceIds: ["stanford-ai-lab-blog"] },
  { id: "bair", label: "BAIR", sourceIds: ["bair-blog"] },
  { id: "cmu-ml", label: "CMU ML", sourceIds: ["cmu-ml-blog"] },
  { id: "mila", label: "Mila", sourceIds: ["mila-blog"] },
  { id: "vector-institute", label: "Vector Institute", sourceIds: ["vector-publications"] }
];

export const EXPERT_LEAF_GROUPS: AggregateLeafGroup[] = [
  { id: "andrej-karpathy", label: "Andrej Karpathy", sourceIds: ["karpathy-x-posts"] },
  { id: "sebastian-raschka", label: "Sebastian Raschka", sourceIds: ["raschka-x-posts"] },
  { id: "boris-cherny", label: "Boris Cherny", sourceIds: ["boris-cherny-x-posts"] },
  { id: "anatoli-kopadze", label: "Anatoli Kopadze", sourceIds: ["anatoli-kopadze-x-posts"] },
  { id: "lilian-weng", label: "Lilian Weng", sourceIds: ["lilian-weng-x-posts"] },
  { id: "tibo", label: "Tibo", sourceIds: ["tibo-x-posts"] }
];

export const CORE_LEAF_GROUPS: AggregateLeafGroup[] = [
  { id: "openai", label: "OpenAI", sourceIds: ["openai-x-posts"] },
  { id: "chatgpt", label: "ChatGPT", sourceIds: ["chatgpt-x-posts"] },
  { id: "anthropic", label: "Anthropic", sourceIds: ["anthropic-x-posts"] },
  { id: "claude", label: "Claude", sourceIds: ["claude-x-posts"] }
];

export const BLOGGER_LEAF_GROUPS: AggregateLeafGroup[] = [
  { id: "alphaxiv", label: "alphaXiv", sourceIds: ["alphaxiv-x-posts"] }
];

export const EXPERTS_BLOGGERS_LEAF_GROUPS: AggregateLeafGroup[] = [
  ...EXPERT_LEAF_GROUPS,
  ...CORE_LEAF_GROUPS,
  ...BLOGGER_LEAF_GROUPS
];

export const MATHEMATICS_OPTIMIZATION_LEAF_GROUPS: AggregateLeafGroup[] = [
  { id: "optimization-online", label: "Optimization Online", sourceIds: ["optimization-online"] },
  { id: "mathprog-journal", label: "Mathematical Programming", sourceIds: ["mathprog-journal"] },
  { id: "siam-optimization", label: "SIAM Optimization", sourceIds: ["siam-optimization"] },
  { id: "informs-mor", label: "INFORMS MOR", sourceIds: ["informs-mor"] }
];

export const MATHEMATICS_LEARNING_THEORY_LEAF_GROUPS: AggregateLeafGroup[] = [
  { id: "jmlr-papers", label: "JMLR", sourceIds: ["jmlr-papers"] },
  { id: "pmlr-colt", label: "COLT", sourceIds: ["pmlr-colt"] },
  { id: "pmlr-alt", label: "ALT", sourceIds: ["pmlr-alt"] }
];

export const MATHEMATICS_STATISTICS_LEAF_GROUPS: AggregateLeafGroup[] = [
  { id: "pmlr-aistats", label: "AISTATS", sourceIds: ["pmlr-aistats"] },
  { id: "pmlr-uai", label: "UAI", sourceIds: ["pmlr-uai"] },
  { id: "statistics-computing", label: "Statistics and Computing", sourceIds: ["statistics-computing"] }
];

export const MATHEMATICS_APPLIED_MATH_LEAF_GROUPS: AggregateLeafGroup[] = [
  { id: "siam-sisc", label: "SIAM Scientific Computing", sourceIds: ["siam-sisc"] },
  { id: "siam-sinum", label: "SIAM Numerical Analysis", sourceIds: ["siam-sinum"] },
  { id: "siam-mds", label: "SIAM Mathematics of Data Science", sourceIds: ["siam-mds"] }
];

export const MATHEMATICS_LEAF_GROUPS: AggregateLeafGroup[] = [
  ...MATHEMATICS_OPTIMIZATION_LEAF_GROUPS,
  ...MATHEMATICS_LEARNING_THEORY_LEAF_GROUPS,
  ...MATHEMATICS_STATISTICS_LEAF_GROUPS,
  ...MATHEMATICS_APPLIED_MATH_LEAF_GROUPS
];

export const AGGREGATE_NAV_SCOPES: AggregateNavScope[] = [
  { id: "vendors", label: "Developers", perLeaf: 2, leafGroups: VENDOR_LEAF_GROUPS },
  { id: "vendors:first", label: "T1", perLeaf: 3, leafGroups: VENDOR_LEAF_GROUPS.slice(0, 2) },
  { id: "vendors:second", label: "T2", perLeaf: 3, leafGroups: VENDOR_LEAF_GROUPS.slice(2) },
  { id: "vendors:qwen", label: "Qwen", perLeaf: 3, leafGroups: VENDOR_LEAF_GROUPS.slice(2, 4) },
  { id: "coding", label: "Coder", perLeaf: 2, leafGroups: CODING_LEAF_GROUPS },
  { id: "coding:codex", label: "Codex", perLeaf: 3, leafGroups: CODING_LEAF_GROUPS.slice(0, 2) },
  { id: "papers", label: "Papers", perLeaf: 2, leafGroups: PAPER_LEAF_GROUPS },
  { id: "papers:huggingface", label: "HuggingFace", perLeaf: 3, leafGroups: HUGGINGFACE_PAPER_LEAF_GROUPS },
  { id: "papers:arxiv", label: "arXiv", perLeaf: 3, leafGroups: ARXIV_PAPER_LEAF_GROUPS },
  { id: "papers:openreview", label: "OpenReview", perLeaf: 3, leafGroups: OPENREVIEW_PAPER_LEAF_GROUPS },
  { id: "labs", label: "Labs", perLeaf: 2, leafGroups: LAB_LEAF_GROUPS },
  { id: "experts-bloggers", label: "Experts&Bloggers", perLeaf: 3, leafGroups: EXPERTS_BLOGGERS_LEAF_GROUPS },
  { id: "experts-bloggers:experts", label: "Experts", perLeaf: 3, leafGroups: EXPERT_LEAF_GROUPS },
  { id: "experts-bloggers:core", label: "Core", perLeaf: 3, leafGroups: CORE_LEAF_GROUPS },
  { id: "experts-bloggers:bloggers", label: "Bloggers", perLeaf: 3, leafGroups: BLOGGER_LEAF_GROUPS },
  { id: "mathematics", label: "Mathematics", perLeaf: 2, leafGroups: MATHEMATICS_LEAF_GROUPS },
  {
    id: "mathematics:optimization",
    label: "Optimization",
    perLeaf: 3,
    leafGroups: MATHEMATICS_OPTIMIZATION_LEAF_GROUPS
  },
  {
    id: "mathematics:learning-theory",
    label: "Learning Theory",
    perLeaf: 3,
    leafGroups: MATHEMATICS_LEARNING_THEORY_LEAF_GROUPS
  },
  {
    id: "mathematics:statistics",
    label: "Statistics",
    perLeaf: 3,
    leafGroups: MATHEMATICS_STATISTICS_LEAF_GROUPS
  },
  {
    id: "mathematics:applied-math",
    label: "Applied Math",
    perLeaf: 3,
    leafGroups: MATHEMATICS_APPLIED_MATH_LEAF_GROUPS
  }
];

export function getAggregateNavScope(id?: string | null): AggregateNavScope | null {
  if (!id) return null;
  return AGGREGATE_NAV_SCOPES.find((scope) => scope.id === id) ?? null;
}

export function aggregateSourceIds(scope: AggregateNavScope): string[] {
  return Array.from(new Set(scope.leafGroups.flatMap((group) => group.sourceIds)));
}

export function selectAggregatePreviewItems(items: StoredItem[], scope: AggregateNavScope): StoredItem[] {
  return scope.leafGroups.flatMap((group) => {
    const sourceIds = new Set(group.sourceIds);
    return items
      .filter((item) => sourceIds.has(item.sourceId))
      .sort(comparePreviewItems)
      .slice(0, scope.perLeaf);
  });
}

function comparePreviewItems(a: StoredItem, b: StoredItem): number {
  if (isHuggingFacePaper(a) && isHuggingFacePaper(b)) {
    return compareHuggingFacePreviewItems(a, b);
  }
  if (a.importance !== b.importance) return b.importance - a.importance;
  return itemTimestamp(b) - itemTimestamp(a);
}

function isHuggingFacePaper(item: StoredItem): boolean {
  return item.sourceId === "huggingface-daily-papers" || item.sourceId === "huggingface-trending-papers";
}

function itemTimestamp(item: StoredItem): number {
  return itemSortTimestamp(item);
}
