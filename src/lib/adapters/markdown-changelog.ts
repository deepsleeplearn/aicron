import { canonicalizeUrl, cleanText } from "../normalization";
import type { RawItem } from "../types";

export function parseMarkdownChangelog(input: {
  sourceId: string;
  sourceName: string;
  url: string;
  markdown: string;
}): RawItem[] {
  const lines = input.markdown.split(/\r?\n/);
  const items: RawItem[] = [];
  let currentTitle: string | null = null;
  let currentBody: string[] = [];

  const flush = () => {
    if (!currentTitle) return;
    const version = currentTitle.replace(/^#+\s*/, "").trim();
    const content = cleanText(currentBody.join(" "));
    items.push({
      sourceId: input.sourceId,
      sourceName: input.sourceName,
      title: `${input.sourceName} ${version}`,
      canonicalUrl: `${canonicalizeUrl(input.url)}#${encodeURIComponent(version)}`,
      content,
      excerpt: content,
      categories: ["coding-agent"]
    });
  };

  for (const line of lines) {
    if (/^##\s+/.test(line)) {
      flush();
      currentTitle = line;
      currentBody = [];
      continue;
    }
    if (currentTitle) currentBody.push(line);
  }
  flush();

  return items.filter((item) => item.content).slice(0, 30);
}

export async function fetchMarkdownChangelogItems(input: {
  sourceId: string;
  sourceName: string;
  url: string;
}): Promise<RawItem[]> {
  const response = await fetch(input.url, {
    headers: { "user-agent": "ai-morning-brief/0.1" },
    next: { revalidate: 0 }
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} while fetching ${input.url}`);
  }
  return parseMarkdownChangelog({
    sourceId: input.sourceId,
    sourceName: input.sourceName,
    url: input.url,
    markdown: await response.text()
  });
}
