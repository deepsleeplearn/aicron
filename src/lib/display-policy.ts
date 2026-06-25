import { DEFAULT_SOURCES } from "./sources";
import type { StoredItem } from "./types";

const ROUTINE_AGENT_SOURCE_IDS = new Set(["openai-codex-releases", "claude-code-changelog"]);
const MAX_AGENT_CHANGES_PER_SOURCE = 4;
const MAX_STATUS_ITEMS_PER_SOURCE = 3;

const HIGH_SIGNAL_AGENT_PATTERNS = [
  /\bbreaking\b/i,
  /\bdeprecat/i,
  /\bremov(?:e|ed|al|ing)\b/i,
  /\bmigration\b/i,
  /\brequir(?:e|ed|es|ing)\b/i,
  /\bsecurity\b/i,
  /\bvulnerab/i,
  /\bcve-\d/i,
  /\bauth(?:entication|orization)?\b/i,
  /\boauth\b/i,
  /\bpermission/i,
  /\bsandbox\b/i,
  /\bmcp\b/i,
  /\bhook/i,
  /\bplugin/i,
  /\bextension/i,
  /\bsdk\b/i,
  /\bapi\b/i,
  /\btool call/i,
  /\bdefault\b/i,
  /\bconfig/i,
  /\bsetting/i,
  /\bgpt-?\d/i,
  /\bmodel\b/i,
  /\bmajor\b/i,
  /\bsignificant\b/i,
  /\bimportant\b/i
];

const LOW_SIGNAL_AGENT_PATTERNS = [
  /\btypo\b/i,
  /\breadme\b/i,
  /\bdocs?\b/i,
  /\bchore\b/i,
  /\bci\b/i,
  /\btest(?:s|ing)?\b/i,
  /\bdependency\b/i,
  /\bbump\b/i,
  /\bminor\b/i,
  /\bpolish\b/i,
  /\bformat(?:ting)?\b/i,
  /\blint\b/i
];

export function shouldShowOnBrief(item: StoredItem): boolean {
  if (!ROUTINE_AGENT_SOURCE_IDS.has(item.sourceId)) return true;
  return isHighSignalAgentChange({
    title: item.title,
    summary: item.summary ?? item.excerpt ?? item.content,
    importance: item.importance,
    tags: item.tags
  });
}

export function applyBriefDisplayPolicy(items: StoredItem[]): StoredItem[] {
  const agentCounts = new Map<string, number>();
  const statusCounts = new Map<string, number>();
  const sourceCounts = new Map<string, number>();
  const statusTitles = new Set<string>();

  return items.filter((item) => {
    if (!matchesSourceTextPolicy(item)) return false;
    if (!shouldShowOnBrief(item)) return false;
    if (exceedsSourceMax(item, sourceCounts)) return false;

    if (item.sourceCategory === "status") {
      const titleKey = `${item.sourceId}:${normalizeDisplayTitle(item.title)}`;
      if (statusTitles.has(titleKey)) return false;

      const currentCount = statusCounts.get(item.sourceId) ?? 0;
      if (currentCount >= MAX_STATUS_ITEMS_PER_SOURCE) return false;

      statusTitles.add(titleKey);
      statusCounts.set(item.sourceId, currentCount + 1);
      return true;
    }

    if (!ROUTINE_AGENT_SOURCE_IDS.has(item.sourceId)) return true;

    const currentCount = agentCounts.get(item.sourceId) ?? 0;
    if (currentCount >= MAX_AGENT_CHANGES_PER_SOURCE) return false;
    agentCounts.set(item.sourceId, currentCount + 1);
    return true;
  });
}

function exceedsSourceMax(item: StoredItem, sourceCounts: Map<string, number>): boolean {
  const source = DEFAULT_SOURCES.find((candidate) => candidate.id === item.sourceId);
  if (typeof source?.maxItems !== "number") return false;
  const currentCount = sourceCounts.get(item.sourceId) ?? 0;
  if (currentCount >= source.maxItems) return true;
  sourceCounts.set(item.sourceId, currentCount + 1);
  return false;
}

function matchesSourceTextPolicy(item: StoredItem): boolean {
  const source = DEFAULT_SOURCES.find((candidate) => candidate.id === item.sourceId);
  if (!source) return true;

  const includePatterns = compilePatterns(source.includeTextPatterns);
  const excludePatterns = compilePatterns(source.excludeTextPatterns);
  const hasCategoryPolicy = (source.includeCategories?.length ?? 0) > 0 || (source.excludeCategories?.length ?? 0) > 0;
  if (includePatterns.length === 0 && excludePatterns.length === 0) return true;

  const text = [item.title, item.summary, item.excerpt, item.content, item.canonicalUrl, item.tags.join(" ")]
    .filter(Boolean)
    .join(" ");
  if (excludePatterns.some((pattern) => pattern.test(text))) return false;
  if (hasCategoryPolicy) return true;
  if (includePatterns.length === 0) return true;
  return includePatterns.some((pattern) => pattern.test(text));
}

function compilePatterns(patterns?: string[]): RegExp[] {
  return (patterns ?? []).map((pattern) => new RegExp(pattern, "i"));
}

export function isHighSignalAgentChange(input: {
  title: string;
  summary?: string | null;
  importance: number;
  tags?: string[];
}): boolean {
  const text = [input.title, input.summary].filter(Boolean).join(" ");
  const highSignals = HIGH_SIGNAL_AGENT_PATTERNS.filter((pattern) => pattern.test(text)).length;
  const lowSignals = LOW_SIGNAL_AGENT_PATTERNS.filter((pattern) => pattern.test(text)).length;

  if (highSignals >= 2) return true;
  if (highSignals >= 1 && input.importance >= 4 && lowSignals === 0) return true;
  return false;
}

function normalizeDisplayTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}
