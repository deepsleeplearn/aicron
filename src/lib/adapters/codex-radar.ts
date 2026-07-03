import { encodeRichHtmlContent } from "../rich-content";
import type { RawItem } from "../types";
import { load } from "cheerio";

type CodexRadarPayload = {
  monitored_at?: string;
  links?: {
    html?: string;
  };
  api_access?: {
    requirements?: {
      attribution_text?: string;
    };
  };
  model_iq?: {
    latest?: CodexRadarMetric;
    recent_days?: CodexRadarMetric[];
    comparisons?: Record<string, { label?: string; latest?: CodexRadarMetric; recent_days?: CodexRadarMetric[] }>;
    quota_radar?: {
      date?: string;
      updated_at?: string;
      basis_window_label?: string;
      cost_usd?: number;
      total_tokens?: number;
      rows?: Array<{
        tier?: string;
        five_h?: number;
        seven_d?: number;
        basis?: string;
      }>;
      trend?: Array<{
        date?: string;
        updated_at?: string;
        five_h_20x?: number;
        seven_d_20x?: number;
        cost_usd?: number;
        total_tokens?: number;
      }>;
    };
  };
};

type CodexRadarMetric = {
  date?: string;
  score?: number;
  status?: string;
  passed?: number;
  tasks?: number;
  cost_usd?: number;
  total_tokens?: number;
  wall_time_human?: string;
  model?: string;
  reasoning_effort?: string;
};

type CodexRadarResetJudgement = {
  eyebrow: string;
  title: string;
  updatedLabel: string;
  verdict: string;
  cards: Array<{
    label: string;
    level: string;
    text: string;
    tone: "high" | "low" | null;
  }>;
  reasons: string[];
  links: Array<{
    label: string;
    href: string;
  }>;
};

type ExtractCodexRadarItemsInput = {
  sourceId: string;
  sourceName: string;
  json: string;
  html?: string;
};

export function extractCodexRadarItems(input: ExtractCodexRadarItemsInput): RawItem[] {
  const payload = JSON.parse(input.json) as CodexRadarPayload;
  const latest = payload.model_iq?.latest;
  const canonicalUrl = payload.links?.html || "https://codexradar.com/";
  const attribution = payload.api_access?.requirements?.attribution_text || "数据来自 Codex 雷达 codexradar.com";
  const latestLabel = latest ? metricLabel("GPT-5.5 xhigh", latest) : "CodexRadar";
  const latestSummary = latest
    ? `${latestLabel} 最新 IQ ${formatNumber(latest.score)}，通过 ${formatPassed(latest)}，费用 ${formatUsd(latest.cost_usd)}。`
    : "Codex 额度、模型 IQ 和降智雷达的公开状态看板。";

  return [
    {
      sourceId: input.sourceId,
      sourceName: input.sourceName,
      title: "CodexRadar",
      canonicalUrl,
      publishedAt: codexRadarPublishedAt(payload),
      excerpt: `Codex 额度、模型 IQ 和降智雷达监控。${latest ? ` ${latestSummary}` : ""}`,
      content: encodeRichHtmlContent(renderCodexRadarHtml(payload, attribution, extractResetJudgement(input.html))),
      categories: ["Tool", "CodexRadar", "Codex", "IQ Radar"],
      sourceOrder: 0
    }
  ];
}

export async function fetchCodexRadarItems(input: {
  sourceId: string;
  sourceName: string;
  url: string;
}): Promise<RawItem[]> {
  const response = await fetch(input.url, {
    headers: {
      accept: "application/json",
      "user-agent": "ai-morning-brief/0.1"
    },
    next: { revalidate: 0 }
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} while fetching ${input.url}`);
  }
  const json = await response.text();
  const payload = JSON.parse(json) as CodexRadarPayload;
  const html = await fetchCodexRadarHtml(payload.links?.html);
  return extractCodexRadarItems({
    sourceId: input.sourceId,
    sourceName: input.sourceName,
    json,
    html
  });
}

async function fetchCodexRadarHtml(url?: string): Promise<string | undefined> {
  if (!url) return undefined;
  try {
    const response = await fetch(url, {
      headers: {
        accept: "text/html",
        "user-agent": "ai-morning-brief/0.1"
      },
      next: { revalidate: 0 }
    });
    if (!response.ok) return undefined;
    return response.text();
  } catch {
    return undefined;
  }
}

function renderCodexRadarHtml(
  payload: CodexRadarPayload,
  attribution: string,
  resetJudgement: CodexRadarResetJudgement | null
): string {
  const series = metricSeries(payload);
  const metrics = series.map(({ label, latest }) => ({ label, metric: latest })).filter((row) => Boolean(row.metric));
  const updateBadge = formatShanghaiUpdateBadge(payload.model_iq?.quota_radar?.updated_at ?? codexRadarPublishedAt(payload));

  return `
    <article class="codexRadarDetail">
      <section class="codexRadarSection codexRadarIntro">
        <h2>介绍</h2>
        <p>CodexRadar 是社区维护的 Codex 监控工具，聚合 Codex 额度估算、固定任务 IQ 评测和降智雷达。适合快速判断当前 Codex 是否稳定、哪个模型档位更值得用。</p>
      </section>

      <section class="codexRadarSection">
        <h2>IQ评测方案</h2>
        <p>CodexRadar 使用固定的混合语言 DeepSWE 任务集做日常 IQ 点评测。每轮在同一组任务上跑多个模型和 reasoning effort 档位，并记录通过数、IQ、Agent steps、费用、cache 命中率、耗时和总 tokens。</p>
        <ul>
          <li>固定任务集：12 道跨 Go、Python、TypeScript、JavaScript、Rust 的真实工程任务。</li>
          <li>核心指标：通过数换算 IQ，结合费用、耗时和 token 量判断性价比。</li>
          <li>更新节奏：原站说明每天约上午和下午各更新一次。</li>
        </ul>
      </section>

      <section class="codexRadarSection">
        <h2>降智雷达 <span class="codexRadarUpdatedBadge">${escapeHtml(updateBadge)}</span><span class="codexRadarScheduleHint">每天更新两次：上午约 7:00-8:00，下午约 13:00-14:00。</span></h2>
        <p>这里沿用原站的监控视角：先看各模型档位当前 IQ，再看最近多轮固定任务趋势。阴影带是 90-110 常态区，曲线低于常态区时说明该配置近期表现偏弱。</p>
        <div class="codexRadarModelGrid">
          ${metrics.map((row, index) => renderMetricCard(row, index)).join("")}
        </div>
        ${renderIqChart(series)}
        ${renderMetricTable(metrics)}
      </section>

      ${renderResetJudgement(resetJudgement)}

      <p class="codexRadarAttribution">${escapeHtml(attribution)} · <a href="https://codexradar.com/" target="_blank" rel="noreferrer">打开 CodexRadar</a></p>
    </article>
  `;
}

function extractResetJudgement(html?: string): CodexRadarResetJudgement | null {
  if (!html) return null;
  const $ = load(html);
  const section = $(".reset-judgement").first();
  if (section.length === 0) return null;

  const head = section.find(".reset-judgement-head").first();
  const titleNode = head.find("h2").first();
  const titleOnly = titleNode.clone();
  titleOnly.find("em").remove();

  const cards = section
    .find(".reset-judgement-card")
    .toArray()
    .map((element) => {
      const card = $(element);
      return {
        label: cleanHtmlText(card.find("span").first().text()),
        level: cleanHtmlText(card.find("strong").first().text()),
        text: cleanHtmlText(card.find("p").first().text()),
        tone: card.hasClass("reset-judgement-card-high")
          ? ("high" as const)
          : card.hasClass("reset-judgement-card-low")
            ? ("low" as const)
            : null
      };
    })
    .filter((card) => card.label || card.level || card.text);

  const reasons = section
    .find(".reset-judgement-reasons li")
    .toArray()
    .map((element) => cleanHtmlText($(element).text()))
    .filter(Boolean);

  const links = section
    .find(".reset-judgement-links a")
    .toArray()
    .map((element) => {
      const link = $(element);
      return {
        label: cleanHtmlText(link.text()),
        href: link.attr("href") ?? ""
      };
    })
    .filter((link) => link.label && link.href);

  const judgement = {
    eyebrow: cleanHtmlText(head.find("span").first().text()) || "重置雷达",
    title: cleanHtmlText(titleOnly.text()) || "重置雷达研判",
    updatedLabel: cleanHtmlText(titleNode.find("em").first().text()),
    verdict: cleanHtmlText(head.children("strong").first().text()),
    cards,
    reasons,
    links
  };

  if (!judgement.verdict && cards.length === 0 && reasons.length === 0) return null;
  return judgement;
}

function renderResetJudgement(judgement: CodexRadarResetJudgement | null): string {
  if (!judgement) return "";
  return `
      <section class="codexRadarSection codexRadarResetJudgement">
        <div class="codexRadarResetHead">
          <div>
            <span>${escapeHtml(judgement.eyebrow)}</span>
            <h2>${escapeHtml(judgement.title)}${judgement.updatedLabel ? ` <em>${escapeHtml(judgement.updatedLabel)}</em>` : ""}</h2>
          </div>
          ${judgement.verdict ? `<strong>${escapeHtml(judgement.verdict)}</strong>` : ""}
        </div>
        ${
          judgement.cards.length > 0
            ? `<div class="codexRadarResetGrid">
                ${judgement.cards.map((card) => `
                  <article class="codexRadarResetCard${card.tone ? ` ${card.tone}` : ""}">
                    <span>${escapeHtml(card.label)}</span>
                    <strong>${escapeHtml(card.level)}</strong>
                    <p>${escapeHtml(card.text)}</p>
                  </article>
                `).join("")}
              </div>`
            : ""
        }
        ${
          judgement.reasons.length > 0
            ? `<ul class="codexRadarResetReasons">
                ${judgement.reasons.map((reason) => `<li>${escapeHtml(reason)}</li>`).join("")}
              </ul>`
            : ""
        }
        ${
          judgement.links.length > 0
            ? `<div class="codexRadarResetLinks">
                ${judgement.links.map((link) => `<a href="${escapeHtml(link.href)}" target="_blank" rel="noreferrer">${escapeHtml(link.label)}</a>`).join("")}
              </div>`
            : ""
        }
      </section>
  `;
}

function metricSeries(payload: CodexRadarPayload): Array<{ label: string; latest: CodexRadarMetric; recentDays: CodexRadarMetric[] }> {
  const rows: Array<{ label: string; latest: CodexRadarMetric; recentDays: CodexRadarMetric[] }> = [];
  if (payload.model_iq?.latest) {
    rows.push({
      label: metricLabel("GPT-5.5 xhigh", payload.model_iq.latest),
      latest: payload.model_iq.latest,
      recentDays: payload.model_iq.recent_days ?? []
    });
  }
  for (const comparison of Object.values(payload.model_iq?.comparisons ?? {})) {
    if (comparison.latest) {
      rows.push({
        label: comparison.label ?? metricLabel("Model", comparison.latest),
        latest: comparison.latest,
        recentDays: comparison.recent_days ?? []
      });
    }
  }
  return rows;
}

function renderMetricCard(row: { label: string; metric: CodexRadarMetric }, index: number): string {
  const tone = metricTone(row.metric.score);
  const color = seriesColor(index);
  return `
    <div class="codexRadarModelCard ${tone}" style="--series-color: ${color}">
      <span>${escapeHtml(row.label)}</span>
      <strong>${escapeHtml(formatNumber(row.metric.score))}</strong>
      <em>${escapeHtml(formatPassed(row.metric))} · ${escapeHtml(row.metric.wall_time_human ?? "未知耗时")}</em>
    </div>
  `;
}

function renderIqChart(series: Array<{ label: string; latest: CodexRadarMetric; recentDays: CodexRadarMetric[] }>): string {
  const dates = Array.from(new Set(series.flatMap((row) => row.recentDays.map((point) => point.date).filter(Boolean) as string[])));
  if (dates.length < 2 || series.length === 0) return "";

  const width = 960;
  const height = 360;
  const padding = { left: 60, right: 28, top: 26, bottom: 48 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const minScore = 45;
  const maxScore = 130;
  const x = (index: number) => padding.left + (dates.length === 1 ? innerWidth / 2 : (innerWidth * index) / (dates.length - 1));
  const y = (score: number) => padding.top + ((maxScore - score) / (maxScore - minScore)) * innerHeight;
  const yTicks = [60, 80, 100, 120];
  const normalTop = y(110);
  const normalBottom = y(90);

  const paths = series
    .map((row, seriesIndex) => {
      const byDate = new Map(row.recentDays.filter((point) => point.date && point.score !== undefined).map((point) => [point.date as string, point]));
      const points = dates
        .map((date, index) => {
          const point = byDate.get(date);
          return point?.score === undefined ? null : { date, score: point.score, x: x(index), y: y(point.score) };
        })
        .filter((point): point is { date: string; score: number; x: number; y: number } => Boolean(point));
      if (points.length < 2) return "";
      const color = seriesColor(seriesIndex);
      return `
        <polyline class="codexRadarSeriesLine" points="${points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ")}" style="--series-color: ${color}" />
        ${points.map((point) => `<circle class="codexRadarSeriesPoint" cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="4.5" style="--series-color: ${color}"><title>${escapeHtml(row.label)} · ${escapeHtml(point.date)} · IQ ${escapeHtml(formatNumber(point.score))}</title></circle>`).join("")}
      `;
    })
    .join("");

  return `
    <figure class="codexRadarChartWrap">
      <figcaption>IQ曲线</figcaption>
      <svg class="codexRadarIqChart" viewBox="0 0 ${width} ${height}" role="img" aria-label="CodexRadar IQ 曲线">
        <rect class="codexRadarNormalBand" x="${padding.left}" y="${normalTop.toFixed(1)}" width="${innerWidth}" height="${(normalBottom - normalTop).toFixed(1)}" rx="14" />
        <text class="codexRadarBandLabel" x="${(padding.left + innerWidth / 2).toFixed(1)}" y="${(normalTop + 34).toFixed(1)}">90-110常态区</text>
        ${yTicks.map((tick) => `
          <line class="codexRadarGridLine" x1="${padding.left}" y1="${y(tick).toFixed(1)}" x2="${padding.left + innerWidth}" y2="${y(tick).toFixed(1)}" />
          <text class="codexRadarYAxis" x="${padding.left - 22}" y="${(y(tick) + 5).toFixed(1)}">${tick}</text>
        `).join("")}
        ${paths}
        ${dates.map((date, index) => `<text class="codexRadarXAxis" x="${x(index).toFixed(1)}" y="${height - 14}">${escapeHtml(shortDateLabel(date))}</text>`).join("")}
      </svg>
    </figure>
  `;
}

function renderMetricTable(rows: Array<{ label: string; metric: CodexRadarMetric }>): string {
  if (rows.length === 0) return "";
  return `
    <table class="codexRadarMetricTable">
      <thead>
        <tr>
          <th>模型</th>
          <th>IQ</th>
          <th>通过数</th>
          <th>费用</th>
          <th>耗时</th>
          <th>总 tokens</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map((row) => `
          <tr>
            <td>${escapeHtml(row.label)}</td>
            <td>${escapeHtml(formatNumber(row.metric.score))}</td>
            <td>${escapeHtml(formatPassed(row.metric))}</td>
            <td>${escapeHtml(formatUsd(row.metric.cost_usd))}</td>
            <td>${escapeHtml(row.metric.wall_time_human ?? "未知")}</td>
            <td>${escapeHtml(formatCompactNumber(row.metric.total_tokens))}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function codexRadarPublishedAt(payload: CodexRadarPayload): string | null {
  return payload.model_iq?.quota_radar?.updated_at ?? payload.monitored_at ?? null;
}

function metricLabel(fallback: string, metric: CodexRadarMetric): string {
  if (!metric.model) return fallback;
  return `${metric.model.toUpperCase()} ${metric.reasoning_effort ?? ""}`.trim();
}

function formatPassed(metric?: CodexRadarMetric): string {
  if (!metric || metric.passed === undefined || metric.tasks === undefined) return "未知";
  return `${metric.passed}/${metric.tasks}`;
}

function formatNumber(value?: number): string {
  return value === undefined || Number.isNaN(value) ? "未知" : String(value);
}

function formatUsd(value?: number): string {
  return value === undefined || Number.isNaN(value) ? "未知" : `$${value.toFixed(2)}`;
}

function formatCompactNumber(value?: number): string {
  if (value === undefined || Number.isNaN(value)) return "未知";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}

function metricTone(score?: number): string {
  if (score === undefined) return "unknown";
  if (score >= 100) return "green";
  if (score >= 80) return "yellow";
  return "red";
}

function seriesColor(index: number): string {
  return ["#16a34a", "#2563eb", "#d97706", "#7c3aed", "#dc2626"][index % 5];
}

function formatShanghaiUpdateBadge(value?: string | null): string {
  if (!value) return "更新时间未知";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const parts = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(date);
  const part = (type: string) => parts.find((entry) => entry.type === type)?.value ?? "";
  return `${part("month")}月${part("day")}日${part("hour")}:${part("minute")}更新`;
}

function shortDateLabel(value: string): string {
  return value
    .replace(/^2026-0?/, "")
    .replace("-am", "_am")
    .replace("-pm", "_pm")
    .replace(/-/g, ".");
}

function cleanHtmlText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
