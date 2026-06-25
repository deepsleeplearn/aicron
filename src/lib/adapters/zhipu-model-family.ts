import * as cheerio from "cheerio";

import { canonicalizeUrl, cleanText } from "../normalization";
import type { RawItem } from "../types";

const MODEL_TITLE_PATTERN = /^(GLM|AutoGLM)/i;
const FLAGSHIP_MODEL_CARDS = [
  {
    title: "GLM-5.2",
    label: "旗舰模型",
    docUrl: "https://docs.bigmodel.cn/cn/guide/models/text/glm-5.2",
    excerpt: "Coding 能力开源 SOTA，Code Arena 全球可用模型第一，长程任务执行更稳定，工程规范遵循更可靠"
  },
  {
    title: "GLM-5V-Turbo",
    label: "多模态Coding基座",
    docUrl: "https://docs.bigmodel.cn/cn/guide/models/vlm/glm-5v-turbo",
    excerpt: "面向视觉编程打造，上下文200K，能够原生处理图片、视频等多模态输入，真正做到“看得懂画面”、“写得出代码”"
  },
  {
    title: "GLM-Image",
    label: "图像生成",
    docUrl: "https://docs.bigmodel.cn/cn/guide/models/image-generation/glm-image",
    excerpt: "文字渲染开源SOTA，海报、科普图等图文混合场景表现佳"
  },
  {
    title: "GLM-OCR",
    label: "视觉模型",
    docUrl: "https://docs.bigmodel.cn/cn/guide/models/vlm/glm-ocr",
    excerpt: "轻量专业的 OCR 模型，又准又省，轻松搞定复杂文档解析"
  },
  {
    title: "GLM-ASR",
    label: "语音识别",
    docUrl: "https://docs.bigmodel.cn/cn/guide/models/sound-and-video/glm-asr",
    excerpt: "实时高清度语音转写，多场景、多语言表现出色，快速又可靠"
  },
  {
    title: "GLM-TTS",
    label: "语音合成",
    docUrl: "https://docs.bigmodel.cn/cn/guide/models/sound-and-video/glm-tts",
    excerpt: "超拟人语音合成，塑造生动自然、富感染力的听觉体验"
  }
];

export function extractZhipuModelFamilyItems(input: {
  sourceId: string;
  sourceName: string;
  url: string;
  html: string;
  supplementalHtml?: string;
  documentHtmlByTitle?: Record<string, string>;
}): RawItem[] {
  const $ = cheerio.load([input.html, input.supplementalHtml ?? ""].join("\n"));
  const seen = new Set<string>();
  const items: RawItem[] = [];

  for (const card of extractFlagshipCards($)) {
    const docOverview = extractDocOverview(input.documentHtmlByTitle?.[card.title] ?? "");
    addModelItem({
      items,
      seen,
      sourceId: input.sourceId,
      sourceName: input.sourceName,
      docUrl: card.docUrl,
      title: card.title,
      label: card.label,
      excerpt: docOverview || card.excerpt
    });
  }

  if (items.length > 0) return items;

  for (const card of FLAGSHIP_MODEL_CARDS) {
    const docOverview = extractDocOverview(input.documentHtmlByTitle?.[card.title] ?? "");
    addModelItem({
      items,
      seen,
      sourceId: input.sourceId,
      sourceName: input.sourceName,
      docUrl: card.docUrl,
      title: card.title,
      label: card.label,
      excerpt: docOverview || card.excerpt
    });
  }

  return items;
}

export async function fetchZhipuModelFamilyItems(input: {
  sourceId: string;
  sourceName: string;
  url: string;
}): Promise<RawItem[]> {
  const [response, ...documentResponses] = await Promise.all([
    fetch(input.url, {
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent": "ai-morning-brief/0.1"
      },
      next: { revalidate: 0 }
    }),
    ...FLAGSHIP_MODEL_CARDS.map((card) =>
      fetch(card.docUrl, {
        headers: {
          accept: "text/html,application/xhtml+xml",
          "user-agent": "ai-morning-brief/0.1"
        },
        next: { revalidate: 0 }
      })
    )
  ]);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} while fetching ${input.url}`);
  }
  const documentHtmlByTitle: Record<string, string> = {};
  for (const [index, documentResponse] of documentResponses.entries()) {
    const card = FLAGSHIP_MODEL_CARDS[index];
    if (card && documentResponse.ok) {
      documentHtmlByTitle[card.title] = await documentResponse.text();
    }
  }

  return extractZhipuModelFamilyItems({
    sourceId: input.sourceId,
    sourceName: input.sourceName,
    url: input.url,
    html: await response.text(),
    documentHtmlByTitle
  });
}

function addModelItem(input: {
  items: RawItem[];
  seen: Set<string>;
  sourceId: string;
  sourceName: string;
  docUrl: string;
  title: string;
  label?: string;
  excerpt?: string;
}) {
  const title = normalizeModelTitle(input.title);
  if (!title || !MODEL_TITLE_PATTERN.test(title) || input.seen.has(title)) return;

  const excerpt = cleanText(input.excerpt ?? "");
  if (!excerpt) return;

  input.seen.add(title);
  input.items.push({
    sourceId: input.sourceId,
    sourceName: input.sourceName,
    title,
    canonicalUrl: canonicalizeUrl(input.docUrl),
    excerpt,
    content: `${excerpt}\n\n官方文档：${input.docUrl}`,
    categories: ["model", input.label ?? "旗舰模型"]
  });
}

function extractFlagshipCards($: cheerio.CheerioAPI) {
  const cards: typeof FLAGSHIP_MODEL_CARDS = [];
  const fullText = $("body").text();
  if (!fullText.includes("旗舰模型家族") && !fullText.includes("GLM-ASR")) return cards;

  for (const fallback of FLAGSHIP_MODEL_CARDS) {
    const titleNode = $(`*:contains("${fallback.title}")`)
      .filter((_, node) => cleanText($(node).text()) === fallback.title)
      .first();
    if (!titleNode.length) continue;

    const container = titleNode.closest("a, article, [data-slot='card'], div").first();
    const containerText = cleanText(container.text());
    const excerpt = containerText
      .replace(fallback.label, "")
      .replace(fallback.title, "")
      .replace(/立即查看/g, "")
      .trim();
    cards.push({
      title: fallback.title,
      label: fallback.label,
      docUrl: fallback.docUrl,
      excerpt: excerpt || fallback.excerpt
    });
  }
  return cards;
}

function extractDocOverview(html: string): string {
  if (!html) return "";
  const $ = cheerio.load(html);
  $("script, style, nav, header, footer").remove();
  const text = cleanText($("body").text());
  const overviewIndex = text.indexOf("概览");
  if (overviewIndex < 0) return "";
  const overview = text.slice(overviewIndex + "概览".length);
  const stopMarkers = [
    "定位",
    "价格",
    "输入模态",
    "能力支持",
    "推荐场景",
    "使用资源",
    "详细介绍",
    "调用示例"
  ];
  const stopIndex = stopMarkers
    .map((marker) => overview.indexOf(marker))
    .filter((index) => index > 30)
    .sort((a, b) => a - b)[0];
  return cleanText(overview.slice(0, stopIndex ?? 500));
}

function normalizeModelTitle(value: string): string {
  return cleanText(value).replace(/\s+/g, " ").trim();
}
