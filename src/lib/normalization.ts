import crypto from "node:crypto";

import type { RankedItem, SourceCategory } from "./types";

export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function canonicalizeUrl(rawUrl: string): string {
  const url = new URL(rawUrl);
  for (const param of Array.from(url.searchParams.keys())) {
    if (param.startsWith("utm_") || ["ref", "ref_src", "fbclid", "gclid"].includes(param)) {
      url.searchParams.delete(param);
    }
  }
  url.hash = "";
  const normalized = url.toString();
  return normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
}

export function computeItemHash(input: {
  sourceId: string;
  canonicalUrl: string;
  title: string;
}): string {
  const material = [
    input.sourceId,
    canonicalizeUrl(input.canonicalUrl),
    normalizeTitle(input.title)
  ].join("|");
  return crypto.createHash("sha256").update(material).digest("hex");
}

const TAG_RULES: Array<{ tag: string; weight: number; patterns: RegExp[] }> = [
  { tag: "breaking-change", weight: 5, patterns: [/breaking/i, /deprecat/i, /migration required/i] },
  { tag: "model", weight: 4, patterns: [/model/i, /gpt-/i, /\bo\d\b/i, /claude/i, /frontier/i] },
  { tag: "api", weight: 4, patterns: [/api/i, /responses/i, /tool call/i, /sdk/i, /webhook/i] },
  { tag: "coding-agent", weight: 3, patterns: [/codex/i, /claude code/i, /agent/i, /sandbox/i] },
  { tag: "pricing", weight: 3, patterns: [/price/i, /pricing/i, /billing/i, /cost/i] },
  { tag: "status", weight: 3, patterns: [/incident/i, /outage/i, /degraded/i, /resolved/i] },
  { tag: "research", weight: 2, patterns: [/research/i, /paper/i, /safety/i, /evaluation/i] }
];

const PASSTHROUGH_CATEGORY_TAGS = new Set([
  "Conferences",
  "Computer Vision",
  "Robotics",
  "NLP",
  "Machine Learning",
  "Reinforcement Learning",
  "arXiv",
  "cs.AI",
  "cs.LG",
  "cs.CL",
  "cs.CV",
  "cs.RO",
  "stat.ML",
  "LLM",
  "Agent",
  "Multi-modal",
  "Vision",
  "RL",
  "Optimization",
  "Algorithm",
  "Optimization Online",
  "JMLR",
  "PMLR",
  "COLT",
  "ALT",
  "AISTATS",
  "UAI",
  "Learning Theory",
  "Statistics",
  "Computational Statistics",
  "SIAM",
  "INFORMS",
  "MOS",
  "Mathematical Programming",
  "Operations Research",
  "Scientific Computing",
  "Applied Math",
  "Numerical Analysis",
  "Mathematics of Data Science",
  "X",
  "Pinned",
  "Original",
  "Repost",
  "Andrej Karpathy",
  "Tool",
  "CodexRadar",
  "IQ Radar"
]);

export function rankItem(input: {
  title: string;
  summary?: string | null;
  categories?: string[];
  sourceCategory: SourceCategory;
}): RankedItem {
  const text = [input.title, input.summary, ...(input.categories ?? [])].filter(Boolean).join(" ");
  const tags = new Set<string>([input.sourceCategory]);
  let score = input.sourceCategory === "status" ? 3 : 1;

  for (const category of input.categories ?? []) {
    if (PASSTHROUGH_CATEGORY_TAGS.has(category)) tags.add(category);
  }

  for (const rule of TAG_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(text))) {
      tags.add(rule.tag);
      score = Math.max(score, rule.weight);
    }
  }

  if (tags.has("breaking-change") && (tags.has("api") || input.sourceCategory === "api")) {
    score = 5;
  }

  return {
    importance: Math.max(1, Math.min(score, 5)),
    tags: Array.from(tags)
  };
}

export function makeExtractiveSummary(input: {
  title: string;
  content?: string | null;
  excerpt?: string | null;
  tags: string[];
  importance: number;
}): { summary: string; whyItMatters: string; action: string } {
  const base = cleanText(input.excerpt || input.content || input.title);
  const summary = truncateSentence(base, 220) || input.title;
  const whyItMatters =
    input.importance >= 4
      ? "可能影响模型选择、API 迁移、工程代理或运行稳定性，建议优先阅读。"
      : "可作为技术背景更新，适合在早报中快速扫过。";
  const action = input.tags.includes("breaking-change")
    ? "检查当前项目是否依赖相关 API 或工具行为。"
    : input.tags.includes("status")
      ? "关注是否影响正在运行的产品、评测或自动化任务。"
      : "阅读原文后按需收藏或交给助手继续分析。";

  return { summary, whyItMatters, action };
}

export function cleanText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function truncateSentence(text: string, maxLength: number): string {
  const cleaned = cleanText(text);
  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, maxLength - 1).trim()}…`;
}
