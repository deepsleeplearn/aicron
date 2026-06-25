import katex from "katex";

const SKIP_TEXT_TAGS = new Set(["code", "kbd", "pre", "samp", "script", "style"]);

type MathDelimiter = {
  open: string;
  close: string;
  displayMode: boolean;
};

const MATH_DELIMITERS: MathDelimiter[] = [
  { open: "$$", close: "$$", displayMode: true },
  { open: "\\[", close: "\\]", displayMode: true },
  { open: "\\(", close: "\\)", displayMode: false }
];

export function renderMathInRichHtml(html: string): string {
  let rendered = "";
  let cursor = 0;
  const skippedTags: string[] = [];

  for (const match of html.matchAll(/<[^>]*>/g)) {
    const tag = match[0];
    const index = match.index ?? 0;
    const text = html.slice(cursor, index);
    rendered += skippedTags.length > 0 ? text : renderMathInText(text);
    rendered += tag;
    updateSkippedTags(skippedTags, tag);
    cursor = index + tag.length;
  }

  const tail = html.slice(cursor);
  rendered += skippedTags.length > 0 ? tail : renderMathInText(tail);
  return rendered;
}

function renderMathInText(text: string): string {
  let rendered = "";
  let cursor = 0;

  while (cursor < text.length) {
    const next = findNextMath(text, cursor);
    if (!next) {
      rendered += text.slice(cursor);
      break;
    }

    rendered += text.slice(cursor, next.start);
    const source = text.slice(next.start, next.end);
    rendered += renderKatex(source, next.expression, next.displayMode);
    cursor = next.end;
  }

  return rendered;
}

function findNextMath(text: string, from: number) {
  let best:
    | {
        start: number;
        end: number;
        expression: string;
        displayMode: boolean;
      }
    | null = null;

  for (const delimiter of MATH_DELIMITERS) {
    const start = findDelimiter(text, delimiter.open, from);
    if (start < 0) continue;
    const expressionStart = start + delimiter.open.length;
    const close = findDelimiter(text, delimiter.close, expressionStart);
    if (close < 0) continue;

    const expression = text.slice(expressionStart, close).trim();
    if (!expression) continue;
    const candidate = {
      start,
      end: close + delimiter.close.length,
      expression,
      displayMode: delimiter.displayMode
    };
    if (!best || candidate.start < best.start) best = candidate;
  }

  return best;
}

function findDelimiter(text: string, delimiter: string, from: number): number {
  let index = text.indexOf(delimiter, from);
  while (index >= 0) {
    if (!isEscapedDelimiter(text, index)) return index;
    index = text.indexOf(delimiter, index + delimiter.length);
  }
  return -1;
}

function isEscapedDelimiter(text: string, index: number): boolean {
  if (text[index] === "\\") return false;
  let slashCount = 0;
  for (let cursor = index - 1; cursor >= 0 && text[cursor] === "\\"; cursor -= 1) {
    slashCount += 1;
  }
  return slashCount % 2 === 1;
}

function renderKatex(source: string, expression: string, displayMode: boolean): string {
  try {
    return katex.renderToString(decodeMathEntities(expression), {
      displayMode,
      output: "htmlAndMathml",
      strict: "ignore",
      throwOnError: false,
      trust: false
    });
  } catch {
    return source;
  }
}

function decodeMathEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");
}

function updateSkippedTags(skippedTags: string[], tag: string) {
  const match = tag.match(/^<\s*(\/)?\s*([a-zA-Z0-9-]+)/);
  if (!match) return;
  const isClosing = Boolean(match[1]);
  const name = match[2]?.toLowerCase();
  if (!name || !SKIP_TEXT_TAGS.has(name)) return;

  if (isClosing) {
    const lastIndex = skippedTags.lastIndexOf(name);
    if (lastIndex >= 0) skippedTags.splice(lastIndex, 1);
  } else if (!tag.endsWith("/>")) {
    skippedTags.push(name);
  }
}
