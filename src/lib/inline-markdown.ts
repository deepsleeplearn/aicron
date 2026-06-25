const SUPERSCRIPT_CHARS: Record<string, string> = {
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
  "+": "⁺",
  "-": "⁻",
  "=": "⁼",
  "(": "⁽",
  ")": "⁾"
};

const MATH_SEGMENT_PATTERN = /(\$\$[\s\S]*?\$\$|\$[^$\n]*?\$|\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\])/g;

export function normalizeInlineMarkdownText(content: string): string {
  return content
    .split(MATH_SEGMENT_PATTERN)
    .map((segment, index) => (index % 2 === 1 ? segment : normalizeBareSuperscripts(segment)))
    .join("");
}

function normalizeBareSuperscripts(content: string): string {
  return content.replace(/\^\{([0-9+\-=()]+)\}|\^([0-9+\-=()]+)/g, (_match, braced: string, plain: string) => {
    const value = braced || plain;
    return [...value].map((char) => SUPERSCRIPT_CHARS[char] ?? char).join("");
  });
}
