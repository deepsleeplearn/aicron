export const RICH_HTML_PREFIX = "ainfo-cron:html\n";

export function encodeRichHtmlContent(html: string): string {
  return `${RICH_HTML_PREFIX}${html.trim()}`;
}

export function isRichHtmlContent(content?: string | null): boolean {
  return Boolean(content?.startsWith(RICH_HTML_PREFIX));
}

export function decodeRichHtmlContent(content?: string | null): string | null {
  if (!isRichHtmlContent(content)) return null;
  return content?.slice(RICH_HTML_PREFIX.length) ?? null;
}

export function richContentToText(content?: string | null): string {
  const value = content ?? "";
  const html = decodeRichHtmlContent(value);
  if (!html) return normalizeText(value);
  return normalizeText(
    html
      .replace(/<\s*br\s*\/?>/gi, " ")
      .replace(/<\s*\/(?:p|div|h[1-6]|li|tr|figure|figcaption|blockquote|pre|table|section|article)\s*>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;|&apos;/g, "'")
  );
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").replace(/\s+([,.;:!?，。；：！？])/g, "$1").trim();
}
