import type { StoredItem } from "./types";
import { isRichHtmlContent, richContentToText } from "./rich-content";

const SHORT_COMPLETE_CONTENT_MIN_LENGTH_BY_SOURCE: Record<string, number> = {
  "openai-codex-changelog": 80,
  "huggingface-daily-papers": 120,
  "huggingface-trending-papers": 120
};

export function hasDisplayableArticleContent(item: Pick<StoredItem, "sourceId" | "content" | "summary" | "excerpt">): boolean {
  if (item.sourceId === "vector-publications") return false;

  const contentLength = normalizeComparableTextLength(richContentToText(item.content));
  if (!contentLength) return false;
  if (isRichHtmlContent(item.content)) return contentLength >= 500;

  if (item.sourceId.startsWith("openreview-")) {
    return contentLength >= 120;
  }

  const shortContentMinLength = SHORT_COMPLETE_CONTENT_MIN_LENGTH_BY_SOURCE[item.sourceId];
  if (shortContentMinLength) {
    return contentLength >= shortContentMinLength;
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
