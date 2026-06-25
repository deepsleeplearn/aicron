import * as cheerio from "cheerio";

export type OilDeltaTone = "up" | "down" | "flat" | "unknown";

export type OilPriceItem = {
  label: "92#" | "95#" | "98#";
  value: string;
  delta: string | null;
  tone: OilDeltaTone;
};

export type OilPriceSnapshot = {
  city: "上海";
  sourceName: string;
  sourceUrl: string;
  fetchedAt: string;
  updatedAt: string | null;
  items: OilPriceItem[];
  error?: string;
};

type OilGrade = OilPriceItem["label"];

const SHANGHAI_OIL_SOURCE_URL = "http://www.qiyoujiage.com/shanghai.shtml";
const OIL_GRADES: Array<{ label: OilGrade; sourcePath: string }> = [
  { label: "92#", sourcePath: "/92.shtml" },
  { label: "95#", sourcePath: "/95.shtml" },
  { label: "98#", sourcePath: "/98.shtml" }
];

let cachedShanghaiOilPrice: { expiresAt: number; snapshot: OilPriceSnapshot } | null = null;

export async function getShanghaiOilPrice(input: { force?: boolean } = {}): Promise<OilPriceSnapshot> {
  const now = Date.now();
  if (!input.force && cachedShanghaiOilPrice && cachedShanghaiOilPrice.expiresAt > now) {
    return cachedShanghaiOilPrice.snapshot;
  }

  const [cityHtml, ...adjustmentHtml] = await Promise.all([
    fetchOilHtml(SHANGHAI_OIL_SOURCE_URL),
    ...OIL_GRADES.map((grade) => fetchOilHtml(`http://www.qiyoujiage.com${grade.sourcePath}`))
  ]);
  const prices = extractShanghaiOilPrices(cityHtml);
  const adjustments = new Map(
    OIL_GRADES.map((grade, index) => [grade.label, extractOilAdjustment(adjustmentHtml[index] ?? "")])
  );
  const items = OIL_GRADES.map((grade) => {
    const value = prices[grade.label];
    if (!value) throw new Error(`未解析到上海 ${grade.label} 油价。`);
    const adjustment = adjustments.get(grade.label) ?? null;
    return {
      label: grade.label,
      value,
      delta: adjustment?.delta ?? null,
      tone: adjustment?.tone ?? "unknown"
    };
  });
  const firstAdjustment = Array.from(adjustments.values()).find(Boolean) ?? null;
  const snapshot: OilPriceSnapshot = {
    city: "上海",
    sourceName: "汽油价格网",
    sourceUrl: SHANGHAI_OIL_SOURCE_URL,
    fetchedAt: new Date(now).toISOString(),
    updatedAt: firstAdjustment?.updatedAt ?? null,
    items
  };

  cachedShanghaiOilPrice = {
    expiresAt: now + msUntilNextOilPriceFetch(new Date(now)),
    snapshot
  };
  return snapshot;
}

export function msUntilNextOilPriceFetch(now = new Date(), fetchHour = 7): number {
  const next = new Date(now);
  next.setHours(fetchHour, 0, 0, 0);
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }
  return next.getTime() - now.getTime();
}

export function extractShanghaiOilPrices(html: string): Partial<Record<OilGrade, string>> {
  const $ = cheerio.load(html);
  const prices: Partial<Record<OilGrade, string>> = {};
  $("#youjia dl").each((_, node) => {
    const title = cleanText($(node).find("dt").text());
    const value = cleanText($(node).find("dd").text());
    const matchedGrade = title.match(/上海(92|95|98)#汽油/);
    const matchedValue = value.match(/\d+(?:\.\d+)?/);
    if (!matchedGrade || !matchedValue) return;
    prices[`${matchedGrade[1]}#` as OilGrade] = matchedValue[0];
  });
  return prices;
}

export function extractOilAdjustment(html: string): { delta: string | null; tone: OilDeltaTone; updatedAt: string | null } | null {
  const $ = cheerio.load(html);
  const text = cleanText($("meta[name='Description']").attr("content") || $("#cont").text() || $("body").text());
  if (!text) return null;

  const updatedAt = text.match(/(\d{4}年\d{1,2}月\d{1,2}日24时)/)?.[1] ?? null;
  if (/搁浅/.test(text)) return { delta: "0", tone: "flat", updatedAt };

  const direction = text.match(/(上调|下调)/)?.[1] ?? null;
  const range = text.match(/(\d+(?:\.\d+)?)元\/升(?:[-~至](\d+(?:\.\d+)?)元\/升)?/);
  if (!direction || !range) return { delta: null, tone: "unknown", updatedAt };

  const sign = direction === "上调" ? "+" : "-";
  const tone: OilDeltaTone = direction === "上调" ? "up" : "down";
  const delta = `${sign}${range[1]}${range[2] ? `~${range[2]}` : ""}`;
  return { delta, tone, updatedAt };
}

async function fetchOilHtml(url: string): Promise<string> {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      "user-agent": "Mozilla/5.0 AICron local oil price fetcher"
    },
    signal: AbortSignal.timeout(12_000)
  });
  if (!response.ok) throw new Error(`油价页面请求失败：${response.status}`);
  return response.text();
}

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}
