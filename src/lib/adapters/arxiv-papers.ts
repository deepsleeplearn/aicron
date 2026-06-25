import * as cheerio from "cheerio";

import { canonicalizeUrl, cleanText } from "../normalization";
import type { RawItem } from "../types";

type FetchArxivPapersInput = {
  sourceId: string;
  sourceName: string;
  url: string;
  maxItems?: number;
};

const USER_AGENT = "ai-morning-brief/0.1";

export async function fetchArxivPaperItems(input: FetchArxivPapersInput): Promise<RawItem[]> {
  const response = await fetch(input.url, {
    headers: { "user-agent": USER_AGENT },
    next: { revalidate: 0 }
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} while fetching ${input.url}`);
  }

  return extractArxivPaperItems({
    ...input,
    xml: await response.text()
  });
}

export function extractArxivPaperItems(input: FetchArxivPapersInput & { xml: string }): RawItem[] {
  const $ = cheerio.load(input.xml, { xmlMode: true });
  const expectedPrimaryCategory = expectedCategoryFromUrl(input.url);
  const items: RawItem[] = [];

  $("entry").each((_index, entry) => {
    const node = $(entry);
    const primaryCategory = node.find("arxiv\\:primary_category, primary_category").first().attr("term") ?? null;
    if (expectedPrimaryCategory && primaryCategory !== expectedPrimaryCategory) return;

    const rawId = cleanText(node.find("id").first().text());
    const arxivId = normalizeArxivId(rawId);
    const title = cleanText(node.find("title").first().text());
    const summary = cleanText(node.find("summary").first().text());
    if (!arxivId || !title) return;

    const categories = Array.from(
      new Set(
        node
          .find("category")
          .toArray()
          .map((category) => $(category).attr("term"))
          .filter(Boolean) as string[]
      )
    );
    const authors = node
      .find("author name")
      .toArray()
      .map((author) => cleanText($(author).text()))
      .filter(Boolean);
    const canonicalUrl = canonicalizeUrl(`https://arxiv.org/abs/${arxivId}`);
    const pdfUrl = `https://arxiv.org/pdf/${arxivId}`;
    const submittedAt = cleanText(node.find("published").first().text()) || null;

    items.push({
      sourceId: input.sourceId,
      sourceName: input.sourceName,
      title,
      canonicalUrl,
      publishedAt: submittedAt,
      submittedAt,
      excerpt: summary,
      content: buildArxivContent({
        title,
        summary,
        authors,
        arxivId,
        categories,
        primaryCategory,
        canonicalUrl,
        pdfUrl
      }),
      categories: ["arXiv", ...categories, ...semanticCategories(`${title} ${summary} ${categories.join(" ")}`)],
      sourceOrder: items.length
    });
  });

  return typeof input.maxItems === "number" ? items.slice(0, input.maxItems) : items;
}

function expectedCategoryFromUrl(rawUrl: string): string | null {
  const url = new URL(rawUrl);
  const query = url.searchParams.get("search_query") ?? "";
  const match = query.match(/\bcat:([A-Za-z.]+)\b/);
  return match?.[1] ?? null;
}

function normalizeArxivId(value: string): string | null {
  const match = value.match(/(?:arxiv\.org\/abs\/)?([0-9]{4}\.[0-9]{4,5})(?:v\d+)?/i);
  return match?.[1] ?? null;
}

function buildArxivContent(input: {
  title: string;
  summary: string;
  authors: string[];
  arxivId: string;
  categories: string[];
  primaryCategory: string | null;
  canonicalUrl: string;
  pdfUrl: string;
}): string {
  return [
    input.title,
    "",
    input.authors.length ? `Authors: ${input.authors.join(", ")}` : null,
    `arXiv ID: ${input.arxivId}`,
    input.primaryCategory ? `Primary category: ${input.primaryCategory}` : null,
    input.categories.length ? `Categories: ${input.categories.join(", ")}` : null,
    `Paper: ${input.canonicalUrl}`,
    `PDF: ${input.pdfUrl}`,
    "",
    "Abstract:",
    input.summary
  ]
    .filter(Boolean)
    .join("\n");
}

function semanticCategories(text: string): string[] {
  const labels: string[] = [];
  addLabel(labels, "LLM", /\b(LLM|large language model|foundation model|instruction tuning|pretrain|alignment|reasoning)\b/i, text);
  addLabel(labels, "Agent", /\b(agent|agents|agentic|tool use|tool-use|planning|autonomous|workflow)\b/i, text);
  addLabel(labels, "NLP", /\b(NLP|LLM|large language models?|language models?|text generation|translation|dialogue|tokenizer)\b/i, text);
  addLabel(labels, "Multi-modal", /\b(multimodal|multi-modal|vision-language|VLM|image generation|video generation)\b/i, text);
  addLabel(labels, "Vision", /\b(vision|image|video|visual|computer vision)\b/i, text);
  addLabel(labels, "Robotics", /\b(robot|robotics|embodied|manipulation|navigation|control)\b/i, text);
  addLabel(labels, "RL", /\b(reinforcement learning|\bRL\b|policy optimization)\b/i, text);
  addLabel(labels, "Optimization", /\b(optimization|optimizer|gradient|training dynamics|generalization)\b/i, text);
  addLabel(labels, "Algorithm", /\b(algorithm|method|framework|benchmark|architecture)\b/i, text);
  return labels;
}

function addLabel(labels: string[], label: string, pattern: RegExp, text: string) {
  if (pattern.test(text) && !labels.includes(label)) labels.push(label);
}
