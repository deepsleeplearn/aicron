import { itemSortTimestamp } from "./date-format";
import { MATHEMATICS_LEAF_GROUPS } from "./nav-aggregation";
import type { StoredItem } from "./types";

type PlazaGroup = {
  id: string;
  label: string;
  sourceIds: string[];
};

export const PLAZA_GROUPS: PlazaGroup[] = [
  { id: "openai", label: "OpenAI", sourceIds: ["openai-research-index"] },
  { id: "anthropic", label: "Anthropic", sourceIds: ["anthropic-research"] },
  { id: "qwen-blog", label: "Qwen / Blog", sourceIds: ["qwen-blog-rss"] },
  { id: "qwen-research", label: "Qwen / Research", sourceIds: ["qwen-research"] },
  { id: "kimi", label: "Kimi", sourceIds: ["kimi-blog"] },
  { id: "minimax", label: "MiniMax", sourceIds: ["minimax-blog"] },
  { id: "zhipu", label: "ZhipuAI", sourceIds: ["zhipu-model-family"] },
  { id: "hf-daily-papers", label: "HuggingFace / Daily Papers", sourceIds: ["huggingface-daily-papers"] },
  { id: "hf-trending-papers", label: "HuggingFace / Trending Papers", sourceIds: ["huggingface-trending-papers"] },
  { id: "openreview-iclr", label: "OpenReview / ICLR", sourceIds: ["openreview-iclr-2026"] },
  { id: "openreview-neurips", label: "OpenReview / NeurIPS", sourceIds: ["openreview-neurips-2025"] },
  { id: "openreview-icml", label: "OpenReview / ICML", sourceIds: ["openreview-icml-2025"] },
  { id: "openreview-colm", label: "OpenReview / COLM", sourceIds: ["openreview-colm-2025"] },
  { id: "stanford-ai-lab", label: "Stanford AI Lab", sourceIds: ["stanford-ai-lab-blog"] },
  { id: "bair", label: "BAIR", sourceIds: ["bair-blog"] },
  { id: "cmu-ml", label: "CMU ML", sourceIds: ["cmu-ml-blog"] },
  { id: "mila", label: "Mila", sourceIds: ["mila-blog"] },
  { id: "vector-institute", label: "Vector Institute", sourceIds: ["vector-publications"] },
  ...MATHEMATICS_LEAF_GROUPS,
  { id: "codex-blog", label: "Codex / Blog", sourceIds: ["openai-codex-blog"] },
  { id: "codex-changelog", label: "Codex / Changelog", sourceIds: ["openai-codex-changelog"] },
  { id: "claude-code", label: "Claude Code", sourceIds: ["claude-blog-posts"] }
];

export const PLAZA_SOURCE_IDS = new Set(PLAZA_GROUPS.flatMap((group) => group.sourceIds));

export function selectLatestPerPlazaGroup(items: StoredItem[]): StoredItem[] {
  const latestByGroup = new Map<string, StoredItem>();

  for (const item of items) {
    const group = PLAZA_GROUPS.find((entry) => entry.sourceIds.includes(item.sourceId));
    if (!group) continue;

    const current = latestByGroup.get(group.id);
    if (!current || itemTimestamp(item) > itemTimestamp(current)) {
      latestByGroup.set(group.id, item);
    }
  }

  return Array.from(latestByGroup.values()).sort((a, b) => itemTimestamp(b) - itemTimestamp(a));
}

function itemTimestamp(item: StoredItem): number {
  return itemSortTimestamp(item);
}
