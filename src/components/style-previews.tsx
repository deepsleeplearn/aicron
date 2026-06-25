import Link from "next/link";

import { formatArticleDate } from "@/lib/date-format";
import type { Source, StoredItem } from "@/lib/types";

export const STYLE_OPTIONS = [
  {
    id: "brief",
    name: "01 精选早报",
    model: "Refind + daily.dev",
    bestFor: "每天 5 分钟扫完重点",
    summary: "Top 3 大块精选 + 分区阅读，强调为什么重要和下一步动作。"
  },
  {
    id: "feed",
    name: "02 开发者信息流",
    model: "daily.dev + 掘金",
    bestFor: "高频刷更新、轻量收藏",
    summary: "瀑布式技术信息流，保留社区内容产品的轻快感。"
  },
  {
    id: "intel",
    name: "03 分析师情报台",
    model: "Feedly Threat Intelligence",
    bestFor: "看趋势、风险、影响面",
    summary: "以实体、风险和信号强度组织内容，更像 AI 行业雷达。"
  },
  {
    id: "reader",
    name: "04 深度阅读器",
    model: "Readwise Reader",
    bestFor: "读长文、问助手、沉淀笔记",
    summary: "左侧队列 + 中央阅读 + 右侧 AI 助手，适合认真读文章。"
  },
  {
    id: "digest",
    name: "05 杂志式简报",
    model: "Newsletter Digest",
    bestFor: "早上像看一份 AI 周刊",
    summary: "编辑感排版，主故事、短讯、来源列表清楚分层。"
  }
];

export function StyleGallery({ items, sources }: { items: StoredItem[]; sources: Source[] }) {
  const top = items.slice(0, 5);
  return (
    <main className="styleHome">
      <section className="styleHero">
        <p>AI Brief UI Direction</p>
        <h1>选择 3 个前端方向做完整版本</h1>
        <span>
          5 个方案全部使用同一套后端数据：{items.length} 条内容，{sources.length} 个来源。
        </span>
      </section>
      <section className="styleGrid">
        {STYLE_OPTIONS.map((style, index) => (
          <Link className={`styleChoice style-${style.id}`} href={`/styles/${style.id}`} key={style.id}>
            <div className="styleChoiceTop">
              <strong>{style.name}</strong>
              <span>{style.model}</span>
            </div>
            <PreviewMiniature styleId={style.id} items={top} />
            <div className="styleChoiceBody">
              <h2>{style.bestFor}</h2>
              <p>{style.summary}</p>
              <small>候选 {index + 1} · 点击打开大图预览</small>
            </div>
          </Link>
        ))}
      </section>
    </main>
  );
}

export function StylePreview({
  styleId,
  items,
  sources
}: {
  styleId: string;
  items: StoredItem[];
  sources: Source[];
}) {
  const style = STYLE_OPTIONS.find((option) => option.id === styleId) ?? STYLE_OPTIONS[0];
  const top = items.slice(0, 8);
  const featured = top[0];
  const secondary = top.slice(1, 4);

  return (
    <main className={`previewPage preview-${style.id}`}>
      <nav className="previewNav">
        <Link href="/styles">← 五种方案</Link>
        <strong>{style.name}</strong>
        <span>{style.model}</span>
      </nav>
      {style.id === "brief" ? (
        <BriefPreview featured={featured} secondary={secondary} items={items} sources={sources} />
      ) : null}
      {style.id === "feed" ? <FeedPreview items={items} sources={sources} /> : null}
      {style.id === "intel" ? <IntelPreview items={items} sources={sources} /> : null}
      {style.id === "reader" ? <ReaderPreview items={items} sources={sources} /> : null}
      {style.id === "digest" ? <DigestPreview items={items} sources={sources} /> : null}
    </main>
  );
}

function PreviewMiniature({ styleId, items }: { styleId: string; items: StoredItem[] }) {
  return (
    <div className="miniature">
      {styleId === "brief" ? (
        <>
          <div className="miniHero" />
          <div className="miniRow strong" />
          <div className="miniCols"><i /><i /><i /></div>
        </>
      ) : null}
      {styleId === "feed" ? (
        <>
          {items.slice(0, 4).map((item) => (
            <div className="miniFeed" key={item.id}><b /><span /></div>
          ))}
        </>
      ) : null}
      {styleId === "intel" ? (
        <>
          <div className="miniRadar" />
          <div className="miniBars"><i /><i /><i /></div>
        </>
      ) : null}
      {styleId === "reader" ? (
        <div className="miniReader"><i /><b /><span /></div>
      ) : null}
      {styleId === "digest" ? (
        <>
          <div className="miniMasthead" />
          <div className="miniMagazine"><i /><i /></div>
        </>
      ) : null}
    </div>
  );
}

function BriefPreview({
  featured,
  secondary,
  items,
  sources
}: {
  featured?: StoredItem;
  secondary: StoredItem[];
  items: StoredItem[];
  sources: Source[];
}) {
  return (
    <section className="briefLayout">
      <header className="briefMast">
        <p>Today Brief · {sources.length} sources</p>
        <h1>今天 AI 工程师需要看的 {items.filter((item) => item.importance >= 4).length} 件事</h1>
      </header>
      {featured ? (
        <article className="leadStory">
          <span>{featured.sourceName}</span>
          <h2>{featured.title}</h2>
          <p>{featured.whyItMatters || featured.summary}</p>
          <button>提炼核心</button>
        </article>
      ) : null}
      <div className="briefCards">
        {secondary.map((item) => (
          <article key={item.id}>
            <small>{item.sourceName}</small>
            <h3>{item.title}</h3>
            <p>{item.action}</p>
          </article>
        ))}
      </div>
      <SectionList title="模型与 API 变化" items={items.filter((item) => item.tags.includes("api") || item.tags.includes("model")).slice(0, 5)} />
      <SectionList title="代码智能体 / 工具" items={items.filter((item) => item.tags.includes("coding-agent")).slice(0, 5)} />
    </section>
  );
}

function FeedPreview({ items, sources }: { items: StoredItem[]; sources: Source[] }) {
  return (
    <section className="devFeedLayout">
      <aside>
        <strong>AI Brief</strong>
        <button className="active">Plaza</button>
        <button>API</button>
        <button>模型</button>
        <button>代码智能体</button>
        <button>稍后读</button>
      </aside>
      <div className="devFeed">
        <div className="devFeedTabs"><span className="active">推荐</span><span>最新</span><span>高优先级</span></div>
        {items.slice(0, 12).map((item) => (
          <article key={item.id}>
            <div>{item.vendor} · {item.sourceName} · {formatDate(item.publishedAt || item.createdAt)}</div>
            <h2>{item.title}</h2>
            <p>{item.summary}</p>
            <footer>{item.tags.slice(0, 3).join(" / ")} <span>问助手</span></footer>
          </article>
        ))}
      </div>
      <aside className="devRight">
        <strong>源状态</strong>
        <p>{sources.length} 个来源已接入</p>
        <strong>今日重点</strong>
        <p>{items.filter((item) => item.importance >= 4).length} 条高优先级内容</p>
      </aside>
    </section>
  );
}

function IntelPreview({ items, sources }: { items: StoredItem[]; sources: Source[] }) {
  const critical = items.filter((item) => item.importance >= 4);
  return (
    <section className="intelLayout">
      <header>
        <div><p>Signal Intelligence</p><h1>AI Industry Radar</h1></div>
        <span>{sources.length} sources · {critical.length} high signal</span>
      </header>
      <div className="intelGrid">
        <div className="signalMap">
          <strong>Signal Map</strong>
          <div className="orb o1">API</div>
          <div className="orb o2">Models</div>
          <div className="orb o3">Agents</div>
          <div className="orb o4">Status</div>
        </div>
        <div className="intelQueue">
          {critical.slice(0, 8).map((item) => (
            <article key={item.id}>
              <span>I{item.importance} · {item.sourceName}</span>
              <h2>{item.title}</h2>
              <p>{item.whyItMatters}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ReaderPreview({ items }: { items: StoredItem[]; sources: Source[] }) {
  const selected = items[0];
  return (
    <section className="readerLayout">
      <aside className="readerQueue">
        <strong>Inbox</strong>
        {items.slice(0, 8).map((item) => (
          <div className={item.id === selected?.id ? "active" : ""} key={item.id}>
            <span>{item.sourceName}</span>
            <p>{item.title}</p>
          </div>
        ))}
      </aside>
      <article className="readingPane">
        <span>{selected?.sourceName}</span>
        <h1>{selected?.title}</h1>
        <p>{selected?.summary}</p>
        <h2>为什么重要</h2>
        <p>{selected?.whyItMatters}</p>
        <h2>建议动作</h2>
        <p>{selected?.action}</p>
      </article>
      <aside className="ghostPane">
        <strong>AI Reading Copilot</strong>
        <button>提炼核心</button>
        <button>梳理介绍</button>
        <button>翻译中文</button>
        <button>我的收获</button>
        <div>选择文本后，可以继续追问、做笔记、生成迁移计划。</div>
      </aside>
    </section>
  );
}

function DigestPreview({ items, sources }: { items: StoredItem[]; sources: Source[] }) {
  const lead = items[0];
  return (
    <section className="digestLayout">
      <header>
        <p>AI ENGINEERING DIGEST</p>
        <h1>Morning Intelligence</h1>
        <span>{formatCurrentDate()} · {sources.length} trusted sources</span>
      </header>
      <main>
        <article className="digestLead">
          <small>Lead Story</small>
          <h2>{lead?.title}</h2>
          <p>{lead?.summary}</p>
        </article>
        <div className="digestColumns">
          <SectionList title="API Watch" items={items.filter((item) => item.tags.includes("api")).slice(0, 4)} />
          <SectionList title="Agent Watch" items={items.filter((item) => item.tags.includes("coding-agent")).slice(0, 4)} />
          <SectionList title="Status Watch" items={items.filter((item) => item.tags.includes("status")).slice(0, 4)} />
        </div>
      </main>
    </section>
  );
}

function SectionList({ title, items }: { title: string; items: StoredItem[] }) {
  return (
    <section className="sectionList">
      <h2>{title}</h2>
      {items.map((item) => (
        <article key={item.id}>
          <span>{item.sourceName}</span>
          <h3>{item.title}</h3>
        </article>
      ))}
    </section>
  );
}

function formatDate(value: string | null): string {
  return formatArticleDate(value).replace(/\s+\d{2}:\d{2}$/, "");
}

function formatCurrentDate(): string {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}
