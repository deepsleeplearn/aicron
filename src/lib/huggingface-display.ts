import { itemDisplayTimestamp } from "./date-format";
import type { StoredItem } from "./types";

export const HUGGINGFACE_DAILY_RECENT_DAYS = 7;
export const HUGGINGFACE_DAILY_TARGET_ITEMS_PER_DAY = 20;
const HUGGINGFACE_DAILY_SOURCE_ID = "huggingface-daily-papers";
const HUGGINGFACE_TRENDING_SOURCE_ID = "huggingface-trending-papers";

export function huggingFacePaperListUrls(input: { sourceId: string; url: string; now?: Date }): string[] {
  if (input.sourceId !== HUGGINGFACE_DAILY_SOURCE_ID) return [input.url];

  const rootUrl = input.url.replace(/\/papers(?:\/date\/\d{4}-\d{2}-\d{2})?\/?$/, "/papers");
  const now = input.now ?? new Date();
  return Array.from({ length: HUGGINGFACE_DAILY_RECENT_DAYS }, (_, index) => {
    const date = new Date(now);
    date.setDate(date.getDate() - index);
    return `${rootUrl}/date/${formatLocalDate(date)}`;
  });
}

export function selectHuggingFaceDailyItems(items: StoredItem[], now = new Date()): StoredItem[] {
  const start = startOfLocalDay(now);
  start.setDate(start.getDate() - (HUGGINGFACE_DAILY_RECENT_DAYS - 1));
  const startTimestamp = start.getTime();

  return items
    .filter((item) => item.sourceId === HUGGINGFACE_DAILY_SOURCE_ID)
    .filter((item) => itemTimestamp(item) >= startTimestamp)
    .sort(compareDailyItems);
}

export function sortHuggingFaceTrendingItems(items: StoredItem[]): StoredItem[] {
  return items
    .filter((item) => item.sourceId === HUGGINGFACE_TRENDING_SOURCE_ID)
    .sort(compareTrendingItems);
}

export function compareHuggingFacePreviewItems(a: StoredItem, b: StoredItem): number {
  if (a.sourceId === HUGGINGFACE_DAILY_SOURCE_ID && b.sourceId === HUGGINGFACE_DAILY_SOURCE_ID) {
    return compareDailyItems(a, b);
  }
  if (a.sourceId === HUGGINGFACE_TRENDING_SOURCE_ID && b.sourceId === HUGGINGFACE_TRENDING_SOURCE_ID) {
    return compareTrendingItems(a, b);
  }
  return 0;
}

export function isHuggingFaceDailySource(sourceIds: string[]): boolean {
  return sourceIds.length > 0 && sourceIds.every((sourceId) => sourceId === HUGGINGFACE_DAILY_SOURCE_ID);
}

export function isHuggingFaceTrendingSource(sourceIds: string[]): boolean {
  return sourceIds.length > 0 && sourceIds.every((sourceId) => sourceId === HUGGINGFACE_TRENDING_SOURCE_ID);
}

function compareDailyItems(a: StoredItem, b: StoredItem): number {
  const timestampDiff = itemTimestamp(b) - itemTimestamp(a);
  if (timestampDiff !== 0) return timestampDiff;
  return sourceOrderValue(a) - sourceOrderValue(b);
}

function compareTrendingItems(a: StoredItem, b: StoredItem): number {
  const timestampDiff = itemTimestamp(b) - itemTimestamp(a);
  if (timestampDiff !== 0) return timestampDiff;
  return sourceOrderValue(a) - sourceOrderValue(b);
}

function sourceOrderValue(item: Pick<StoredItem, "sourceOrder">): number {
  return item.sourceOrder ?? Number.MIN_SAFE_INTEGER;
}

function itemTimestamp(item: StoredItem): number {
  return itemDisplayTimestamp(item.submittedAt || item.publishedAt || item.createdAt);
}

function startOfLocalDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function formatLocalDate(value: Date): string {
  return [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, "0"),
    String(value.getDate()).padStart(2, "0")
  ].join("-");
}
