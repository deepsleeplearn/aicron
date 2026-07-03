import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { DEFAULT_SOURCES } from "../src/lib/sources";

const CODEX_RADAR_SOURCE_ID = "codex-radar";

test("CodexRadar is configured as a scheduled Tools source", () => {
  const source = DEFAULT_SOURCES.find((candidate) => candidate.id === CODEX_RADAR_SOURCE_ID);

  assert.ok(source, "codex-radar source should exist");
  assert.equal(source.name, "CodexRadar");
  assert.equal(source.vendor, "CodexRadar");
  assert.equal(source.category, "tools");
  assert.equal(source.type, "codex-radar");
  assert.equal(source.url, "https://codexradar.com/current.json");
  assert.equal(source.enabled, true);
});

test("CodexRadar is wired into fetcher, API, and Tools navigation", () => {
  const fetcherSource = readFileSync("src/lib/fetcher.ts", "utf8");
  const apiSource = readFileSync("src/app/api/items/route.ts", "utf8");
  const dashboardSource = readFileSync("src/components/dashboard.tsx", "utf8");

  assert.match(fetcherSource, /fetchCodexRadarItems/);
  assert.match(fetcherSource, /source\.type === "codex-radar"/);
  assert.match(apiSource, /TOOLS_SOURCE_IDS/);
  assert.match(apiSource, /view === "tools"/);

  assert.match(dashboardSource, /type NavSectionId = .*"tools"/s);
  assert.match(dashboardSource, /TOOLS_NAV_SECTION/);
  assert.match(dashboardSource, /\[\.\.\.NAV_SECTIONS, TOOLS_NAV_SECTION\]/);
  assert.match(dashboardSource, /TOOLS_BRANCHES/);
  assert.match(dashboardSource, /id: "codex-radar"/);
  assert.match(dashboardSource, /selectToolDetailItem/);
  assert.match(dashboardSource, /section === "tools"/);
  assert.match(dashboardSource, /selectedSummary = selectedItem\?\.sourceId === "codex-radar" \? null/);
});

test("codex radar adapter builds a focused rich detail item", async () => {
  const adapterPath = path.join(process.cwd(), "src/lib/adapters/codex-radar.ts");
  assert.equal(existsSync(adapterPath), true, "codex-radar adapter should exist");

  const { extractCodexRadarItems } = await import("../src/lib/adapters/codex-radar");
  const items = extractCodexRadarItems({
    sourceId: CODEX_RADAR_SOURCE_ID,
    sourceName: "CodexRadar",
    json: JSON.stringify({
      schema_version: "2.0",
      monitored_at: "2026-07-01T06:27:00+08:00",
      links: { html: "https://codexradar.com/" },
      api_access: {
        requirements: {
          attribution_text: "数据来自 Codex 雷达 codexradar.com"
        }
      },
      model_iq: {
        latest: {
          date: "2026-07-01-am",
          score: 62.5,
          passed: 5,
          tasks: 12,
          cost_usd: 46.348455,
          total_tokens: 49893455,
          wall_time_human: "37分钟",
          model: "gpt-5.5",
          reasoning_effort: "xhigh"
        },
        recent_days: [
          { date: "2026-06-30-pm", score: 87.5, passed: 7, tasks: 12 },
          { date: "2026-07-01-am", score: 62.5, passed: 5, tasks: 12 }
        ],
        comparisons: {
          gpt_55_medium: {
            label: "GPT-5.5 medium",
            latest: {
              score: 87.5,
              passed: 7,
              tasks: 12,
              cost_usd: 20.98977,
              total_tokens: 19617905,
              wall_time_human: "32分钟"
            },
            recent_days: [
              { date: "2026-06-30-pm", score: 75, passed: 6, tasks: 12 },
              { date: "2026-07-01-am", score: 87.5, passed: 7, tasks: 12 }
            ]
          }
        },
        quota_radar: {
          updated_at: "2026-06-30T22:27:57Z",
          basis_window_label: "7d",
          cost_usd: 132.690071,
          total_tokens: 176492670,
          rows: [
            { tier: "20x Pro", five_h: 276.44, seven_d: 1658.63, basis: "measured 7d" }
          ]
        }
      }
    }),
    html: `
      <section class="reset-judgement" aria-label="重置雷达研判">
        <div class="reset-judgement-head">
          <div>
            <span>重置雷达</span>
            <h2>重置雷达研判 <em>7月3日12:10研判</em></h2>
          </div>
          <strong>发卡路径占优</strong>
        </div>
        <div class="reset-judgement-grid">
          <article class="reset-judgement-card reset-judgement-card-high">
            <span>发重置卡</span>
            <strong>高 · 基本已触发</strong>
            <p>Tibo 最新回复明确说 reset 应该在用户的 little piggy bank 里。</p>
          </article>
          <article class="reset-judgement-card reset-judgement-card-low">
            <span>硬重置</span>
            <strong>低到中低</strong>
            <p>短期更可能发卡而不是再把全员额度周期清零。</p>
          </article>
        </div>
        <ul class="reset-judgement-reasons">
          <li>官方信号强：Tibo 最新回复说 reset 应在 little piggy bank 里。</li>
          <li>硬重置动机本轮仍弱。</li>
        </ul>
        <div class="reset-judgement-links">
          <a href="https://x.com/thsottiaux/status/2072608196993188002" target="_blank" rel="noreferrer">Tibo 最新回复 ↗</a>
          <a href="https://x.com/dkundel/status/2072422693081940445" target="_blank" rel="noreferrer">发卡信号 ↗</a>
        </div>
      </section>
    `
  });

  assert.equal(items.length, 1);
  assert.equal(items[0]?.title, "CodexRadar");
  assert.equal(items[0]?.canonicalUrl, "https://codexradar.com/");
  assert.equal(items[0]?.publishedAt, "2026-06-30T22:27:57Z");
  assert.deepEqual(items[0]?.categories, ["Tool", "CodexRadar", "Codex", "IQ Radar"]);
  assert.match(items[0]?.excerpt ?? "", /Codex 额度、模型 IQ 和降智雷达/);
  assert.match(items[0]?.content ?? "", /<h2>介绍<\/h2>/);
  assert.doesNotMatch(items[0]?.content ?? "", /codexRadarStatGrid/);
  assert.doesNotMatch(items[0]?.content ?? "", /codexRadarQuotaTable/);
  assert.match(items[0]?.content ?? "", /IQ评测方案/);
  assert.match(items[0]?.content ?? "", /降智雷达/);
  assert.match(items[0]?.content ?? "", /7月1日06:27更新/);
  assert.match(items[0]?.content ?? "", /每天更新两次：上午约 7:00-8:00，下午约 13:00-14:00。/);
  assert.match(items[0]?.content ?? "", /codexRadarIqChart/);
  assert.match(items[0]?.content ?? "", /90-110常态区/);
  assert.match(items[0]?.content ?? "", /codexRadarResetJudgement/);
  assert.match(items[0]?.content ?? "", /重置雷达研判/);
  assert.match(items[0]?.content ?? "", /7月3日12:10研判/);
  assert.match(items[0]?.content ?? "", /发卡路径占优/);
  assert.match(items[0]?.content ?? "", /codexRadarResetCard high/);
  assert.match(items[0]?.content ?? "", /codexRadarResetCard low/);
  assert.match(items[0]?.content ?? "", /高 · 基本已触发/);
  assert.match(items[0]?.content ?? "", /codexRadarResetLinks/);
  assert.match(items[0]?.content ?? "", /https:\/\/x\.com\/thsottiaux\/status\/2072608196993188002/);
  assert.doesNotMatch(items[0]?.content ?? "", /社区体感分/);
  assert.doesNotMatch(items[0]?.content ?? "", /codexRadarCommunityGrid/);
  assert.match(items[0]?.content ?? "", /GPT-5\.5 xhigh/);
  assert.match(items[0]?.content ?? "", /62\.5/);
  assert.match(items[0]?.content ?? "", /数据来自 Codex 雷达 codexradar\.com/);
});
