export type ListTeaserInput = {
  title: string;
  summary?: string | null;
  excerpt?: string | null;
};

export function selectListTeaserText(item: ListTeaserInput): string {
  const titleKey = normalizeComparableText(item.title);
  const candidates = [item.summary, item.excerpt];

  for (const candidate of candidates) {
    const cleaned = cleanDisplayText(candidate);
    if (!cleaned) continue;
    if (normalizeComparableText(cleaned) === titleKey) continue;
    return cleaned;
  }

  return "";
}

function cleanDisplayText(value?: string | null): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeComparableText(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/[`*_~#[\](){}>]/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
