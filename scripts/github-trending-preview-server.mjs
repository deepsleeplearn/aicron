import { existsSync } from "node:fs";
import http from "node:http";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const { DatabaseSync } = require("node:sqlite");

const portArgIndex = process.argv.indexOf("--port");
const port = portArgIndex >= 0 ? Number(process.argv[portArgIndex + 1]) : 3001;
const dbPath = path.join(process.cwd(), "data", "morning-brief.db");

const fallbackRepos = [
  {
    title: "Panniantong/Agent-Reach",
    url: "https://github.com/Panniantong/Agent-Reach",
    description: "Give your AI agent eyes to see the entire internet.",
    language: "Python",
    stars: "33,287",
    forks: "2,673",
    today: "1,161 stars today"
  },
  {
    title: "bytedance/UI-TARS-desktop",
    url: "https://github.com/bytedance/UI-TARS-desktop",
    description: "The Open-Source Multimodal AI Agent Stack.",
    language: "TypeScript",
    stars: "36,712",
    forks: "3,701",
    today: "150 stars today"
  }
];

function loadRepos() {
  if (!existsSync(dbPath)) return fallbackRepos;
  const db = new DatabaseSync(dbPath);
  const rows = db
    .prepare(
      `
      SELECT i.title, i.canonical_url, i.excerpt, s.summary
      FROM items i
      LEFT JOIN summaries s ON s.item_id = i.id
      WHERE i.source_id = 'github-trending'
      ORDER BY i.created_at DESC
      LIMIT 24
    `
    )
    .all();
  db.close();
  const repos = rows.map((row) => parseRepo(row));
  return repos.length > 0 ? repos : fallbackRepos;
}

function parseRepo(row) {
  const text = String(row.summary || row.excerpt || "");
  return {
    title: String(row.title),
    url: String(row.canonical_url),
    description: text.split(" · ")[0] || "GitHub Trending project.",
    language: match(text, /语言：([^·]+)/),
    stars: match(text, /Stars：([^·]+)/),
    forks: match(text, /Forks：([^·]+)/),
    today: match(text, /([\d,]+\s+stars today)/i)
  };
}

function match(text, pattern) {
  return text.match(pattern)?.[1]?.trim() || "Unknown";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function languageColor(language) {
  const colors = {
    TypeScript: "#3178c6",
    JavaScript: "#d7ba00",
    Python: "#3572a5",
    Rust: "#dea584",
    Go: "#00add8",
    Shell: "#89e051",
    C: "#555555",
    "C++": "#f34b7d"
  };
  return colors[language] || "#6f7681";
}

function todayNumber(repo) {
  const raw = repo.today.match(/[\d,]+/)?.[0] || "0";
  return Number(raw.replaceAll(",", ""));
}

function numberLike(value) {
  return value === "Unknown" ? "0" : value;
}

function todayBar(repo, maxToday, variant = "rail") {
  const percent = Math.max(5, Math.round((todayNumber(repo) / Math.max(maxToday, 1)) * 100));
  return `
    <div class="todayRail ${variant}" aria-label="Stars today ${escapeHtml(repo.today)}">
      <div class="railTrack"><i style="height:${percent}%"></i></div>
    </div>
  `;
}

function renderBalancedCard(repo, index, maxToday) {
  return `
    <article class="repoCard balancedCard">
      <div class="cardBody">
        <div class="cardTop">
          <span class="rank">#${index + 1}</span>
          <span class="lang"><i style="background:${languageColor(repo.language)}"></i>${escapeHtml(repo.language)}</span>
        </div>
        <h2>${escapeHtml(repo.title)}</h2>
        <p>${escapeHtml(repo.description)}</p>
        <div class="statGrid">
          <span><strong>${escapeHtml(numberLike(repo.stars))}</strong><em>Stars</em></span>
          <span><strong>${escapeHtml(numberLike(repo.forks))}</strong><em>Forks</em></span>
          <span><strong>${escapeHtml(repo.today.replace(/ stars today/i, ""))}</strong><em>Today</em></span>
        </div>
        <a href="${escapeHtml(repo.url)}" target="_blank" rel="noreferrer">打开仓库</a>
      </div>
      ${todayBar(repo, maxToday, "rail")}
    </article>
  `;
}

function renderSignalCard(repo, index, maxToday) {
  return `
    <article class="repoCard signalCard">
      <div class="cardBody">
        <div class="cardTop">
          <span class="rank strongRank">#${index + 1}</span>
          <span class="todayBadge">+${escapeHtml(repo.today.replace(/ stars today/i, ""))}</span>
        </div>
        <h2>${escapeHtml(repo.title)}</h2>
        <p>${escapeHtml(repo.description)}</p>
        <div class="statsLine">
          <span class="lang"><i style="background:${languageColor(repo.language)}"></i>${escapeHtml(repo.language)}</span>
          <span>${escapeHtml(numberLike(repo.stars))} stars</span>
          <span>${escapeHtml(numberLike(repo.forks))} forks</span>
          <span>${escapeHtml(repo.today.replace(/ stars today/i, ""))} today</span>
        </div>
        <a href="${escapeHtml(repo.url)}" target="_blank" rel="noreferrer">打开仓库</a>
      </div>
      ${todayBar(repo, maxToday, "signal")}
    </article>
  `;
}

function renderCompactMetricCard(repo, index, maxToday) {
  return `
    <article class="repoCard compactMetricCard">
      <div class="cardBody">
        <div class="cardTop">
          <span class="rank">#${index + 1}</span>
          <span class="lang"><i style="background:${languageColor(repo.language)}"></i>${escapeHtml(repo.language)}</span>
        </div>
        <h2>${escapeHtml(repo.title)}</h2>
        <p>${escapeHtml(repo.description)}</p>
        <div class="compactStats">
          <span><em>Stars</em><strong>${escapeHtml(numberLike(repo.stars))}</strong></span>
          <span><em>Forks</em><strong>${escapeHtml(numberLike(repo.forks))}</strong></span>
          <span><em>Today</em><strong>${escapeHtml(repo.today.replace(/ stars today/i, ""))}</strong></span>
        </div>
        <a href="${escapeHtml(repo.url)}" target="_blank" rel="noreferrer">打开仓库</a>
      </div>
      ${todayBar(repo, maxToday, "compact")}
    </article>
  `;
}

function renderLeaderboard(repo, index, maxToday) {
  const percent = Math.max(7, Math.round((todayNumber(repo) / Math.max(maxToday, 1)) * 100));
  return `
    <article class="leaderRow">
      <span class="rank large">${index + 1}</span>
      <div class="leaderMain">
        <div class="leaderTitle">
          <h2>${escapeHtml(repo.title)}</h2>
          <span class="lang"><i style="background:${languageColor(repo.language)}"></i>${escapeHtml(repo.language)}</span>
        </div>
        <p>${escapeHtml(repo.description)}</p>
        <div class="bar"><span style="width:${percent}%"></span></div>
      </div>
      <div class="leaderStats">
        <strong>${escapeHtml(repo.today.replace(/ stars today/i, ""))}</strong><span>today</span>
        <strong>${escapeHtml(numberLike(repo.stars))}</strong><span>stars</span>
        <strong>${escapeHtml(numberLike(repo.forks))}</strong><span>forks</span>
      </div>
      <a href="${escapeHtml(repo.url)}" target="_blank" rel="noreferrer">Repo</a>
    </article>
  `;
}

function renderCompact(repo, index) {
  return `
    <a class="miniRepo" href="${escapeHtml(repo.url)}" target="_blank" rel="noreferrer">
      <span>#${index + 1}</span>
      <strong>${escapeHtml(repo.title)}</strong>
      <em>${escapeHtml(repo.language)}</em>
      <b>${escapeHtml(repo.today.replace(/ stars today/i, ""))}</b>
    </a>
  `;
}

function renderPage() {
  const repos = loadRepos();
  const maxToday = Math.max(...repos.map(todayNumber), 1);
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Github 热榜展示方案</title>
  <style>
    :root { --text:#202733; --muted:#667085; --line:#e6e8eb; --soft:#f7f8fa; --blue:#1d7afc; --green:#1a7f37; --orange:#bf6a02; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #fff; color: var(--text); font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; letter-spacing: 0; }
    a { color: inherit; text-decoration: none; }
    .shell { max-width: 1500px; margin: 0 auto; padding: 28px 36px 48px; }
    .hero { display: flex; justify-content: space-between; gap: 28px; align-items: flex-end; border-bottom: 1px solid var(--line); padding-bottom: 18px; }
    .hero h1 { margin: 0; font-size: 30px; line-height: 1.18; }
    .hero p { margin: 8px 0 0; color: var(--muted); font-size: 14px; }
    .tabs { position: sticky; top: 0; z-index: 10; display: flex; gap: 8px; margin: 18px 0 28px; padding: 10px 0; background: rgba(255,255,255,.94); backdrop-filter: blur(12px); }
    .tabs button { border: 1px solid var(--line); background: #fff; border-radius: 6px; padding: 8px 12px; color: #4b5563; font-size: 13px; cursor: pointer; }
    .tabs button.active { border-color: var(--blue); background: #eef6ff; color: #0b63ce; }
    .variant { display: none; }
    .variant.active { display: block; }
    .sectionHead { display:flex; align-items:flex-end; justify-content:space-between; gap:20px; margin-bottom:16px; }
    .sectionHead h2 { margin:0; font-size:22px; }
    .sectionHead p { max-width:720px; margin:6px 0 0; color:var(--muted); font-size:14px; line-height:1.65; }
    .cardGrid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
    .repoCard { min-height: 236px; display:grid; grid-template-columns:minmax(0,1fr) 46px; gap:14px; border:1px solid var(--line); border-radius:8px; padding:16px; background:#fff; transition: transform .16s ease, border-color .16s ease, box-shadow .16s ease; }
    .repoCard:hover { transform: translateY(-2px); border-color:#b8d7ff; box-shadow:0 12px 34px rgba(15,23,42,.08); }
    .cardBody { min-width:0; display:flex; flex-direction:column; }
    .cardTop, .leaderTitle, .statsLine { display:flex; align-items:center; justify-content:space-between; gap:10px; }
    .rank { display:inline-flex; align-items:center; justify-content:center; width:34px; height:24px; border-radius:999px; background:#f2f4f7; color:#475467; font-weight:700; font-size:12px; }
    .strongRank { background:#eef6ff; color:#0b63ce; }
    .rank.large { width:42px; height:42px; border-radius:10px; font-size:18px; }
    .todayBadge { border:1px solid #b9e3c6; border-radius:999px; background:#effaf3; color:#1a7f37; padding:4px 8px; font-size:12px; font-weight:700; }
    .lang { display:inline-flex; align-items:center; gap:6px; color:#59636e; font-size:12px; }
    .lang i { width:10px; height:10px; border-radius:50%; display:block; }
    .repoCard h2, .leaderRow h2 { margin:15px 0 8px; font-size:18px; line-height:1.28; word-break:break-word; }
    .repoCard p { flex:1; margin:0; color:#4e5969; font-size:14px; line-height:1.6; }
    .statGrid { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin:16px 0 14px; }
    .statGrid span { border:1px solid #edf0f3; border-radius:6px; padding:9px 8px; background:#fafafa; }
    .statGrid strong { display:block; font-size:16px; line-height:1.1; }
    .statGrid em { display:block; margin-top:4px; color:var(--muted); font-style:normal; font-size:11px; }
    .repoCard a, .leaderRow a, .featured a { display:inline-flex; align-items:center; justify-content:center; border:1px solid var(--line); border-radius:6px; padding:8px 10px; color:#344054; font-size:13px; }
    .repoCard a:hover, .leaderRow a:hover, .featured a:hover { border-color:var(--blue); color:var(--blue); }
    .todayRail { display:grid; justify-items:center; align-items:center; min-height:204px; border-left:1px solid #edf0f3; padding-left:12px; }
    .railTrack { position:relative; width:10px; height:120px; overflow:hidden; border-radius:999px; background:#edf1f5; }
    .railTrack i { position:absolute; left:0; right:0; bottom:0; border-radius:999px; background:#20a464; }
    .todayRail.signal { min-height:218px; padding-left:14px; border-left-color:#d7eedf; }
    .todayRail.signal .railTrack { width:16px; height:142px; background:#e9f7ed; }
    .todayRail.signal .railTrack i { background:linear-gradient(180deg,#45c267,#138a3d); }
    .compactMetricCard { min-height:184px; grid-template-columns:minmax(0,1fr) 38px; padding:14px; }
    .compactMetricCard h2 { margin-top:12px; font-size:16px; }
    .compactMetricCard p { display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; font-size:13px; line-height:1.55; }
    .compactStats { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; margin:13px 0 12px; }
    .compactStats span { display:flex; align-items:baseline; justify-content:space-between; gap:8px; border-top:1px solid #edf0f3; padding-top:8px; }
    .compactStats em { color:var(--muted); font-size:11px; font-style:normal; }
    .compactStats strong { font-size:14px; }
    .todayRail.compact { min-height:156px; padding-left:10px; }
    .todayRail.compact .railTrack { width:8px; height:92px; }
    .compactGrid { grid-template-columns:repeat(3,minmax(0,1fr)); }
    .leaderList { display:flex; flex-direction:column; border-top:1px solid var(--line); }
    .leaderRow { display:grid; grid-template-columns:58px 1fr 210px 72px; gap:16px; align-items:center; padding:16px 0; border-bottom:1px solid var(--line); }
    .leaderRow h2 { margin:0; }
    .leaderRow p { margin:6px 0 10px; color:#4e5969; font-size:14px; line-height:1.55; }
    .bar { height:7px; overflow:hidden; border-radius:999px; background:#eef1f4; }
    .bar span { display:block; height:100%; border-radius:999px; background:linear-gradient(90deg,#1d7afc,#20a464); }
    .leaderStats { display:grid; grid-template-columns:1fr 1fr; gap:4px 10px; align-items:baseline; }
    .leaderStats strong { text-align:right; font-size:17px; }
    .leaderStats span { color:var(--muted); font-size:12px; }
    .board { display:grid; grid-template-columns:minmax(420px, 1.1fr) .9fr; gap:18px; align-items:start; }
    .featured { min-height:430px; border:1px solid #b8d7ff; border-radius:8px; background:linear-gradient(180deg,#f8fbff 0,#fff 36%); padding:24px; }
    .featured .kicker { display:inline-flex; border:1px solid #cce2ff; border-radius:999px; background:#eef6ff; color:#0b63ce; padding:5px 9px; font-size:12px; font-weight:700; }
    .featured h2 { margin:18px 0 10px; font-size:32px; line-height:1.15; word-break:break-word; }
    .featured p { color:#3f4a59; font-size:16px; line-height:1.75; }
    .bigStats { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin:28px 0; }
    .bigStats div { border-left:3px solid #d8e9ff; padding-left:12px; }
    .bigStats strong { display:block; font-size:26px; }
    .bigStats span { color:var(--muted); font-size:12px; }
    .miniList { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
    .miniRepo { min-height:88px; display:grid; grid-template-columns:36px 1fr auto; grid-template-rows:auto auto; column-gap:10px; border:1px solid var(--line); border-radius:8px; padding:12px; background:#fff; }
    .miniRepo:hover { border-color:#b8d7ff; }
    .miniRepo span { grid-row:1 / 3; color:#98a2b3; font-weight:700; }
    .miniRepo strong { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:14px; }
    .miniRepo em { color:var(--muted); font-size:12px; font-style:normal; }
    .miniRepo b { grid-column:3; grid-row:1 / 3; align-self:center; color:var(--green); font-size:14px; }
    .note { margin-top:16px; color:#98a2b3; font-size:12px; }
    @media (max-width: 1040px) { .cardGrid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .leaderRow { grid-template-columns:48px 1fr; } .leaderStats, .leaderRow a { grid-column:2; } .board { grid-template-columns:1fr; } }
    @media (max-width: 680px) { .shell { padding:20px 16px 38px; } .hero { align-items:flex-start; flex-direction:column; } .tabs { overflow:auto; } .cardGrid, .miniList { grid-template-columns:1fr; } .repoCard { grid-template-columns:minmax(0,1fr) 42px; } .bigStats { grid-template-columns:1fr; } }
  </style>
</head>
<body>
  <main class="shell">
    <header class="hero">
      <div>
        <h1>Github 热榜展示方案</h1>
        <p>同一批 Trending 数据，三种“项目名片 + 右侧 stars today 对比条”展示方式。</p>
      </div>
      <p>${repos.length} 个项目 · 数据来自本地 ai-morning-brief SQLite</p>
    </header>
    <nav class="tabs" aria-label="展示方案">
      <button class="active" data-target="balanced">方案 A1：均衡细轨</button>
      <button data-target="signal">方案 A2：热度强调</button>
      <button data-target="compact">方案 A3：紧凑信息</button>
    </nav>
    <section id="balanced" class="variant active">
      <div class="sectionHead">
        <div>
          <h2>均衡细轨</h2>
          <p>保留方案 A 的名片阅读节奏，右侧用窄竖条表达 today 相对热度。卡片主体仍然优先展示项目名、简介、语言、Stars 和 Forks。</p>
        </div>
      </div>
      <div class="cardGrid">${repos.slice(0, 12).map((repo, index) => renderBalancedCard(repo, index, maxToday)).join("")}</div>
    </section>
    <section id="signal" class="variant">
      <div class="sectionHead">
        <div>
          <h2>热度强调</h2>
          <p>仍然是卡片网格，但把 today 数值和右侧竖条都做得更显眼，适合你每天优先判断“今天真正冲上来的项目”。</p>
        </div>
      </div>
      <div class="cardGrid">${repos.slice(0, 12).map((repo, index) => renderSignalCard(repo, index, maxToday)).join("")}</div>
    </section>
    <section id="compact" class="variant">
      <div class="sectionHead">
        <div>
          <h2>紧凑信息</h2>
          <p>压缩卡片高度，保留右侧竖条和核心指标。适合主站需要同屏显示更多项目时使用，但描述区会更克制。</p>
        </div>
      </div>
      <div class="cardGrid compactGrid">${repos.slice(0, 15).map((repo, index) => renderCompactMetricCard(repo, index, maxToday)).join("")}</div>
    </section>
    <p class="note">Prototype only. 选择方案后再折回主站组件实现。</p>
  </main>
  <script>
    const buttons = Array.from(document.querySelectorAll(".tabs button"));
    const panels = Array.from(document.querySelectorAll(".variant"));
    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        buttons.forEach((item) => item.classList.toggle("active", item === button));
        panels.forEach((panel) => panel.classList.toggle("active", panel.id === button.dataset.target));
      });
    });
  </script>
</body>
</html>`;
}

const server = http.createServer((request, response) => {
  if (request.url === "/health") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ ok: true, repoCount: loadRepos().length }));
    return;
  }
  response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  response.end(renderPage());
});

server.listen(port, "127.0.0.1", () => {
  console.log(`GitHub Trending preview running at http://127.0.0.1:${port}`);
});
