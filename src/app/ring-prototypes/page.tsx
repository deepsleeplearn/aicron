"use client";

import { ArrowLeft, ArrowRight, Star } from "lucide-react";
import type { CSSProperties } from "react";
import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const ARTICLES = [
  {
    vendor: "OpenAI",
    source: "Research",
    title: "Predicting model behavior before release by simulating deployment",
    summary: "Deployment simulation for earlier safety and behavior evaluation before broad release.",
    tone: "openai",
    date: "2026/06/18 09:30"
  },
  {
    vendor: "Anthropic",
    source: "Research",
    title: "Tracing the thoughts of a large language model",
    summary: "Mechanistic interpretability work for understanding internal model behavior.",
    tone: "anthropic",
    date: "2026/06/17 18:20"
  },
  {
    vendor: "Qwen",
    source: "Research",
    title: "Qwen3.7-Plus: Multimodal Agent Intelligence",
    summary: "A multimodal agent model focused on visual reasoning and tool-oriented workflows.",
    tone: "qwen",
    date: "2026/06/17 12:10"
  },
  {
    vendor: "MiniMax",
    source: "Blog",
    title: "MiniMax M3: long context coding and native multimodality",
    summary: "Engineering-oriented model update with coding, context, and multimodal usage notes.",
    tone: "minimax",
    date: "2026/06/16 22:45"
  },
  {
    vendor: "Codex",
    source: "Blog",
    title: "Using skills to accelerate open source maintenance",
    summary: "A practical Codex workflow note for repeatable engineering maintenance tasks.",
    tone: "codex",
    date: "2026/06/16 15:00"
  },
  {
    vendor: "Claude Code",
    source: "Post",
    title: "Claude Code workflow patterns for daily engineering",
    summary: "Selected posts around coding assistant workflows and team-level engineering practice.",
    tone: "claude",
    date: "2026/06/15 19:40"
  }
];

const VARIANTS = [
  { id: "A", name: "Cover Loop" },
  { id: "A2", name: "Dense Coverflow" },
  { id: "A3", name: "Wide Gallery" },
  { id: "A4", name: "Production Strip" }
];

export default function RingPrototypePage() {
  return (
    <Suspense fallback={<main className="ringPrototypePage" />}>
      <RingPrototypeContent />
    </Suspense>
  );
}

function RingPrototypeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const variant = searchParams.get("variant") ?? "A";
  const normalized = VARIANTS.some((item) => item.id === variant) ? variant : "A";
  const currentIndex = VARIANTS.findIndex((item) => item.id === normalized);
  const current = VARIANTS[currentIndex] ?? VARIANTS[0];

  const setVariant = (nextIndex: number) => {
    const next = VARIANTS[(nextIndex + VARIANTS.length) % VARIANTS.length];
    router.replace(`/ring-prototypes?variant=${next.id}`, { scroll: false });
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
    <main className="ringPrototypePage">
      <section className="ringPrototypeHeader">
        <div>
          <p>Plaza 环形卡片原型</p>
          <h1>Ring Plaza</h1>
        </div>
        <div className="prototypeMeta">
          <span>{current.id}</span>
          <strong>{current.name}</strong>
        </div>
      </section>

      {normalized === "A" ? <VariantGlassOrbit /> : null}
      {normalized === "A2" ? <VariantAngledReadableRing /> : null}
      {normalized === "A3" ? <VariantWideHaloRing /> : null}
      {normalized === "A4" ? <VariantTableReadableRing /> : null}

      <div className="prototypeSwitcher">
        <button onClick={() => setVariant(currentIndex - 1)} aria-label="Previous variant">
          <ArrowLeft size={16} />
        </button>
        <span>{current.id} - {current.name}</span>
        <button onClick={() => setVariant(currentIndex + 1)} aria-label="Next variant">
          <ArrowRight size={16} />
        </button>
      </div>
    </main>
  );
}

function VariantGlassOrbit() {
  return (
    <section className="ringStage coverflowStage">
      <CoverflowLoop className="classicCoverflow" />
      <aside className="ringCaption">
        <strong>A</strong>
        <span>Cover Loop</span>
      </aside>
    </section>
  );
}

function VariantAngledReadableRing() {
  return (
    <section className="ringStage coverflowStage">
      <CoverflowLoop className="denseCoverflow" dense />
      <aside className="ringCaption">
        <strong>A2</strong>
        <span>Dense Coverflow</span>
      </aside>
    </section>
  );
}

function VariantWideHaloRing() {
  return (
    <section className="ringStage coverflowStage wideCoverflowStage">
      <CoverflowLoop className="wideCoverflow" wide />
      <aside className="ringCaption">
        <strong>A3</strong>
        <span>Wide Gallery</span>
      </aside>
    </section>
  );
}

function VariantTableReadableRing() {
  return (
    <section className="ringStage coverflowStage compactCoverflowStage">
      <CoverflowLoop className="productionCoverflow" compact />
      <aside className="ringCaption">
        <strong>A4</strong>
        <span>Production Strip</span>
      </aside>
    </section>
  );
}

function CoverflowLoop({
  className,
  compact = false,
  wide = false,
  dense = false
}: {
  className: string;
  compact?: boolean;
  wide?: boolean;
  dense?: boolean;
}) {
  return (
    <div className={`coverflowLoop ${className} ${wide ? "wide" : ""} ${compact ? "compact" : ""} ${dense ? "dense" : ""}`}>
      <div className="coverflowDottedPlane" />
      {ARTICLES.map((article, index) => (
        <article
          key={article.title}
          className={`coverflowCard ${article.tone} ${compact ? "compact" : ""}`}
          style={{
            "--coverflow-delay": `${-(index * 6)}s`
          } as CSSProperties}
        >
          <div className="coverflowCardInner">
            <div className="ringArticleTop">
              <span>{article.vendor}</span>
              <small>{article.date}</small>
            </div>
            <h2>{article.title}</h2>
            <p>{article.summary}</p>
            <footer>
              <span>{article.source}</span>
              <button><Star size={13} /> 收藏</button>
            </footer>
          </div>
        </article>
      ))}
      <div className="coverflowControls" aria-hidden="true">
        <button type="button">上一个</button>
        <button type="button">下一个</button>
      </div>
    </div>
  );
}
