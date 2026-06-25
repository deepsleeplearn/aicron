const DATE_ONLY_PATTERNS = [
  /^\d{4}$/,
  /^\d{4}-\d{2}-\d{2}$/,
  /^\d{4}-\d{2}-\d{2}T00:00:00(?:\.000)?Z$/,
  /^(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2}, \d{4}$/i
];

export function formatArticleDate(value: string | null): string {
  if (!value) return "No date";
  if (isDateOnlyValue(value)) return formatDateOnlyValue(value);

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

export function itemDisplayTimestamp(value: string | null | undefined): number {
  if (!value) return 0;
  if (isDateOnlyValue(value)) {
    const dateOnly = parseDateOnlyParts(value);
    if (dateOnly) return Date.UTC(dateOnly.year, dateOnly.month - 1, dateOnly.day);
  }

  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function itemSortTimestamp(item: {
  submittedAt?: string | null;
  publishedAt?: string | null;
  createdAt: string;
}): number {
  return itemDisplayTimestamp(item.submittedAt || item.publishedAt || item.createdAt);
}

export function isCurrentLocalItemDate(
  item: {
    submittedAt?: string | null;
    publishedAt?: string | null;
    createdAt: string;
  },
  now = new Date()
): boolean {
  const value = item.submittedAt || item.publishedAt || item.createdAt;
  const itemParts = localDateParts(value);
  const todayParts = {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate()
  };
  if (!itemParts || !todayParts) return false;
  return (
    itemParts.year === todayParts.year &&
    itemParts.month === todayParts.month &&
    itemParts.day === todayParts.day
  );
}

export function formatItemDateLabel(item: {
  sourceId?: string | null;
  submittedAt?: string | null;
  publishedAt?: string | null;
  createdAt: string;
}): string {
  const submit = item.submittedAt ? formatArticleDate(item.submittedAt) : null;
  const publish = item.publishedAt ? formatArticleDate(item.publishedAt) : null;

  if (submit || isDualTimeSource(item.sourceId)) {
    return [submit ? `submit ${submit}` : null, publish ? `publish ${publish}` : null]
      .filter(Boolean)
      .join(" · ") || formatArticleDate(item.createdAt);
  }

  return formatArticleDate(item.publishedAt || item.createdAt);
}

export function isDateOnlyValue(value: string): boolean {
  const trimmed = value.trim();
  return DATE_ONLY_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function formatDateOnlyValue(value: string): string {
  const parts = parseDateOnlyParts(value);
  if (!parts) return value;
  if (parts.month === 1 && parts.day === 1 && value.trim() === String(parts.year)) return String(parts.year);
  return [
    String(parts.year),
    String(parts.month).padStart(2, "0"),
    String(parts.day).padStart(2, "0")
  ].join("/");
}

function localDateParts(value: string): { year: number; month: number; day: number } | null {
  const dateOnly = parseDateOnlyParts(value);
  if (dateOnly) return dateOnly;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate()
  };
}

function isDualTimeSource(sourceId?: string | null): boolean {
  return sourceId === "huggingface-daily-papers" || sourceId === "huggingface-trending-papers";
}

function parseDateOnlyParts(value: string): { year: number; month: number; day: number } | null {
  const trimmed = value.trim();
  const yearMatch = trimmed.match(/^(\d{4})$/);
  if (yearMatch) {
    return {
      year: Number(yearMatch[1]),
      month: 1,
      day: 1
    };
  }

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return {
      year: Number(isoMatch[1]),
      month: Number(isoMatch[2]),
      day: Number(isoMatch[3])
    };
  }

  const utcMidnightMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})T00:00:00(?:\.000)?Z$/);
  if (utcMidnightMatch) {
    return {
      year: Number(utcMidnightMatch[1]),
      month: Number(utcMidnightMatch[2]),
      day: Number(utcMidnightMatch[3])
    };
  }

  const namedMatch = trimmed.match(/^([A-Za-z]+) (\d{1,2}), (\d{4})$/);
  if (!namedMatch) return null;
  const month = monthIndex(namedMatch[1] ?? "");
  if (!month) return null;
  return {
    year: Number(namedMatch[3]),
    month,
    day: Number(namedMatch[2])
  };
}

function monthIndex(value: string): number {
  const key = value.slice(0, 3).toLowerCase();
  return ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].indexOf(key) + 1;
}
