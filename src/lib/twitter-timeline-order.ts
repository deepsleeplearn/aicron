import { itemSortTimestamp } from "./date-format";
import type { StoredItem } from "./types";

export function sortTwitterUserPostItems<T extends Pick<StoredItem, "sourceOrder" | "submittedAt" | "publishedAt" | "createdAt">>(
  items: T[]
): T[] {
  return [...items].sort((a, b) => {
    const orderDelta = normalizedSourceOrder(a.sourceOrder) - normalizedSourceOrder(b.sourceOrder);
    if (orderDelta !== 0) return orderDelta;
    return itemSortTimestamp(b) - itemSortTimestamp(a);
  });
}

function normalizedSourceOrder(value: number | null): number {
  return value === null ? Number.MAX_SAFE_INTEGER : value;
}
