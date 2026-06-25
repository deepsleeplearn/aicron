"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const OIL_PRICE = [
  { label: "92#", value: "7.42", delta: "+0.03" },
  { label: "95#", value: "7.90", delta: "+0.03" },
  { label: "98#", value: "8.80", delta: "-0.02" },
];

const VARIANTS = [
  { id: "A", name: "多行上下弹幕", note: "多条油价按行上下慢速轮换，静止时间更长，适合放在左侧栏下方。" },
  { id: "B", name: "胶囊滑入提示", note: "像环境提示一样偶尔从左侧滑入，停留后淡出。" },
  { id: "C", name: "单项轮播 ticker", note: "每次只展示一个油号，最安静，适合弱信息。" },
  { id: "D", name: "静态底注 + 微动", note: "默认静态，只有很弱的扫描线提示数据仍在更新。" },
];

export default function OilPricePrototypePage() {
  return (
    <Suspense fallback={<main className="oilPrototypePage" />}>
      <OilPricePrototypeContent />
    </Suspense>
  );
}

function OilPricePrototypeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selected = searchParams.get("variant") ?? "A";
  const current = VARIANTS.some((variant) => variant.id === selected) ? selected : "A";
  const currentIndex = VARIANTS.findIndex((variant) => variant.id === current);
  const currentVariant = VARIANTS[currentIndex] ?? VARIANTS[0];

  const setVariant = (nextIndex: number) => {
    const next = VARIANTS[(nextIndex + VARIANTS.length) % VARIANTS.length];
    router.replace(`/oil-price-prototypes?variant=${next.id}`, { scroll: false });
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, [contenteditable='true']")) return;
      if (event.key === "ArrowLeft") setVariant(currentIndex - 1);
      if (event.key === "ArrowRight") setVariant(currentIndex + 1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [currentIndex]);

  return (
    <main className="oilPrototypePage">
      <section className="oilPrototypeHeader">
        <div>
          <p>PROTOTYPE - Shanghai oil ambient info</p>
          <h1>每日油价左侧栏低干扰展示</h1>
        </div>
        <div className="oilPrototypeMeta">
          <span>{currentVariant.id}</span>
          <strong>{currentVariant.name}</strong>
          <small>{currentVariant.note}</small>
        </div>
      </section>

      <section className="oilWorkspaceMock">
        <header className="oilMockTopbar">
          <div className="oilMockLogo">
            <span />
            AICron
          </div>
        </header>

        <div className="oilMockBody">
          <aside className="oilMockRail">
            <nav className="oilMockNav" aria-label="mock navigation">
              {["Plaza", "Developers", "Coder", "Github Hot", "Papers", "Labs"].map((item, index) => (
                <button className={index === 0 ? "active" : ""} key={item}>{item}</button>
              ))}
            </nav>

            {current === "A" ? <OilVariantA /> : null}
            {current === "B" ? <OilVariantB /> : null}
            {current === "C" ? <OilVariantC /> : null}
            {current === "D" ? <OilVariantD /> : null}
          </aside>

          <section className="oilMockFeed">
            <h2>Plaza</h2>
            <p>这里模拟主内容区域。油价只作为左侧底部的附带信息，不进入主信息流，也不影响文章扫描。</p>
            {Array.from({ length: 5 }, (_, index) => (
              <article key={index}>
                <span>Anthropic · Research · 06/{18 - index}</span>
                <h3>{["Agentic coding and persistent returns to expertise", "A near-autonomous AI chemist improves a challenging reaction", "Qwen-Robotics: model suite for embodied agents", "CMU ML research blog update", "Hugging Face Daily Papers"][index]}</h3>
                <p>模拟文章摘要，用来观察油价模块是否抢主内容注意力。</p>
              </article>
            ))}
          </section>
        </div>
      </section>

      <div className="oilPrototypeSwitcher">
        <button onClick={() => setVariant(currentIndex - 1)} aria-label="上一个方案">
          <ArrowLeft size={16} />
        </button>
        <span>{currentVariant.id} - {currentVariant.name}</span>
        <button onClick={() => setVariant(currentIndex + 1)} aria-label="下一个方案">
          <ArrowRight size={16} />
        </button>
      </div>
    </main>
  );
}

function OilVariantA() {
  return (
    <section className="oilAmbient oilVariantA" aria-label="上海油价">
      <div className="oilAmbientHead">
        <span>上海油价</span>
        <time>较上期</time>
      </div>
      <div className="oilVerticalTickerWindow">
        <div className="oilVerticalTickerTrack">
          <OilPriceRows />
          <OilPriceRows />
        </div>
      </div>
    </section>
  );
}

function OilVariantB() {
  return (
    <section className="oilAmbient oilVariantB" aria-label="上海油价">
      <div className="oilPillNotice">
        <span>上海油价</span>
        <strong>92# {OIL_PRICE[0].value}</strong>
        <em>95# {OIL_PRICE[1].value}</em>
      </div>
      <p>间歇出现，默认弱存在。</p>
    </section>
  );
}

function OilVariantC() {
  return (
    <section className="oilAmbient oilVariantC" aria-label="上海油价">
      <div className="oilAmbientHead">
        <span>上海油价</span>
        <time>今日</time>
      </div>
      <div className="oilSlotTicker">
        {OIL_PRICE.map((item, index) => (
          <div className="oilSlotItem" style={{ animationDelay: `${index * 5}s` }} key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <em className={`oilDelta ${deltaTone(item.delta)}`}>{item.delta}</em>
          </div>
        ))}
      </div>
    </section>
  );
}

function OilVariantD() {
  return (
    <section className="oilAmbient oilVariantD" aria-label="上海油价">
      <div className="oilAmbientHead">
        <span>上海油价</span>
        <time>今日</time>
      </div>
      <div className="oilQuietGrid">
        {OIL_PRICE.map((item) => (
          <div key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function OilPriceRows() {
  return (
    <div className="oilPriceRows">
      {OIL_PRICE.map((item) => (
        <div className="oilPriceRow" key={item.label}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          <em className={`oilDelta ${deltaTone(item.delta)}`}>{item.delta}</em>
        </div>
      ))}
    </div>
  );
}

function deltaTone(delta: string): "up" | "down" | "flat" {
  if (delta.startsWith("+")) return "up";
  if (delta.startsWith("-")) return "down";
  return "flat";
}
