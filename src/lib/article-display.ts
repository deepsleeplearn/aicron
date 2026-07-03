import type { StoredItem } from "./types";
import { isRichHtmlContent, richContentToText } from "./rich-content";

const SHORT_COMPLETE_CONTENT_MIN_LENGTH_BY_SOURCE: Record<string, number> = {
  "karpathy-x-posts": 1,
  "raschka-x-posts": 1,
  "boris-cherny-x-posts": 1,
  "alphaxiv-x-posts": 1,
  "anatoli-kopadze-x-posts": 1,
  "lilian-weng-x-posts": 1,
  "openai-x-posts": 1,
  "chatgpt-x-posts": 1,
  "anthropic-x-posts": 1,
  "claude-x-posts": 1,
  "openai-codex-changelog": 80,
  "huggingface-daily-papers": 120,
  "huggingface-trending-papers": 120
};

export function hasDisplayableArticleContent(item: Pick<StoredItem, "sourceId" | "content" | "summary" | "excerpt">): boolean {
  if (item.sourceId === "vector-publications") return false;

  const contentLength = normalizeComparableTextLength(richContentToText(item.content));
  if (!contentLength) return false;

  const shortContentMinLength = SHORT_COMPLETE_CONTENT_MIN_LENGTH_BY_SOURCE[item.sourceId];
  if (shortContentMinLength) {
    return contentLength >= shortContentMinLength;
  }

  if (isRichHtmlContent(item.content)) return contentLength >= 500;

  if (item.sourceId.startsWith("openreview-")) {
    return contentLength >= 120;
  }

  if (contentLength < 500) return false;

  const fallbackLength = Math.max(
    normalizeComparableTextLength(item.summary),
    normalizeComparableTextLength(item.excerpt)
  );

  return contentLength > fallbackLength + 120;
}

function normalizeComparableTextLength(value?: string | null): number {
  return (value ?? "").replace(/\s+/g, " ").trim().length;
}
