"use client";

import { ArrowLeft, ArrowRight, ExternalLink, Star } from "lucide-react";
import type { PointerEvent, WheelEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

const ARTICLES = [
  {
    vendor: "OpenAI",
    sourceName: "OpenAI Research Index",
    label: "OpenAI",
    title: "A near-autonomous AI chemist improves a challenging reaction",
    summary: "OpenAI and Molecule.one show how an AI chemist improved a key drug-making reaction.",
    date: "2026/06/17 18:00",
    importance: 4,
    tone: "toneOpenAI"
  },
  {
    vendor: "Anthropic",
    sourceName: "Anthropic Research",
    label: "Anthropic",
    title: "Agentic coding and persistent returns to expertise",
    summary: "Research notes on how software teams can compound expertise with coding agents.",
    date: "2026/06/16 00:00",
    importance: 3,
    tone: "toneAnthropic"
  },
  {
    vendor: "Qwen",
    sourceName: "Qwen Research",
    label: "Qwen / Research",
    title: "Qwen-Robotics: model suite for embodied agents",
    summary: "The Qwen family expands toward grounded reasoning and robot-agent workflows.",
    date: "2026/06/16 10:00",
    importance: 4,
    tone: "toneQwen"
  },
  {
    vendor: "MiniMax",
    sourceName: "MiniMax Blog",
    label: "MiniMax",
    title: "MiniMax M3: long-context coding and multimodal agents",
    summary: "A coding-focused model update around 1M context, tool use, and multimodal work.",
    date: "2026/06/15 20:00",
    importance: 4,
    tone: "toneMiniMax"
  },
  {
    vendor: "Codex",
    sourceName: "Codex Blog",
    label: "Codex / Blog",
    title: "Designing delightful frontends with GPT-5.4",
    summary: "A practical workflow for front-end iteration, critique, and implementation handoff.",
    date: "2026/06/15 13:30",
    importance: 4,
    tone: "toneCodex"
  },
  {
    vendor: "Claude Code",
    sourceName: "Claude Blog Posts",
    label: "Claude Code",
    title: "Claude Design now stays on brand for daily work",
    summary: "Posts around Claude workflow, daily work, and engineering assistant usage.",
    date: "2026/06/14 08:40",
    importance: 3,
    tone: "toneClaude"
  }
];

const VARIANTS = [
  {
    id: "snap",
    label: "方案 A：吸附翻页",
    note: "横向滑动累计到阈值后切一张，最稳定，不容易误触。"
  },
  {
    id: "scrub",
    label: "方案 B：连续跟手",
    note: "触摸板滑多少，卡片环就移动多少，最像直接拨动图片带。"
  },
  {
    id: "inertia",
    label: "方案 C：惯性回弹",
    note: "跟手滑动后保留一点惯性，再自动贴近最近的主卡。"
  }
] as const;

type VariantId = (typeof VARIANTS)[number]["id"];

const AUTO_SPEED = 0.045;
const STEP = 1 / ARTICLES.length;

export default function PlazaGesturePrototypePage() {
  const [variant, setVariant] = useState<VariantId>("snap");

  return (
    <main className="gesturePrototypePage">
      <header className="gesturePrototypeHeader">
        <div>
          <p>Plaza 触摸板交互原型</p>
          <h1>Plaza Gesture Lab</h1>
        </div>
        <div className="gesturePrototypeTabs" role="tablist" aria-label="选择交互方案">
          {VARIANTS.map((item) => (
            <button
              key={item.id}
              className={variant === item.id ? "active" : ""}
              onClick={() => setVariant(item.id)}
            >
              {item.label.replace("方案 ", "")}
            </button>
          ))}
        </div>
      </header>

      <GestureShowcase variant={variant} />
    </main>
  );
}

function GestureShowcase({ variant }: { variant: VariantId }) {
  const phaseRef = useRef(0);
  const velocityRef = useRef(0);
  const wheelBucketRef = useRef(0);
  const idleTimerRef = useRef<number | null>(null);
  const dragRef = useRef<{ active: boolean; lastX: number; lastAt: number }>({
    active: false,
    lastX: 0,
    lastAt: 0
  });
  const [phase, setPhase] = useState(0);
  const [pausedUntil, setPausedUntil] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);

  const variantMeta = VARIANTS.find((item) => item.id === variant) ?? VARIANTS[0];

  useEffect(() => {
    let frame = 0;
    let previous = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(48, now - previous) / 1000;
      previous = now;

      if (variant === "inertia") {
        phaseRef.current += velocityRef.current * dt;
        velocityRef.current *= Math.pow(0.13, dt);
        if (Math.abs(velocityRef.current) < 0.015 && now > pausedUntil) {
          phaseRef.current = easeTowardNearestSlot(phaseRef.current, 0.075);
        }
      }

      if (now > pausedUntil) {
        phaseRef.current += AUTO_SPEED * dt;
      }

      phaseRef.current = normalizePhase(phaseRef.current);
      setPhase(phaseRef.current);
      setActiveIndex(nearestIndex(phaseRef.current));
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [pausedUntil, variant]);

  useEffect(() => {
    phaseRef.current = 0;
    velocityRef.current = 0;
    wheelBucketRef.current = 0;
    setPhase(0);
  }, [variant]);

  function handleWheel(event: WheelEvent<HTMLElement>) {
    const delta = horizontalWheelDelta(event);
    if (Math.abs(delta) < 1) return;
    event.preventDefault();
    applyGestureDelta(delta, 1);
  }

  function handlePointerDown(event: PointerEvent<HTMLElement>) {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      active: true,
      lastX: event.clientX,
      lastAt: performance.now()
    };
    setPausedUntil(performance.now() + 2200);
  }

  function handlePointerMove(event: PointerEvent<HTMLElement>) {
    if (!dragRef.current.active) return;
    const now = performance.now();
    const delta = dragRef.current.lastX - event.clientX;
    const elapsed = Math.max(12, now - dragRef.current.lastAt);
    dragRef.current = {
      active: true,
      lastX: event.clientX,
      lastAt: now
    };
    applyGestureDelta(delta, 1.35);
    if (variant === "inertia") {
      velocityRef.current = clamp(delta / elapsed, -1.2, 1.2);
    }
  }

  function handlePointerUp(event: PointerEvent<HTMLElement>) {
    dragRef.current.active = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (variant === "scrub") {
      phaseRef.current = snapToNearestSlot(phaseRef.current);
    }
  }

  function applyGestureDelta(delta: number, multiplier: number) {
    setPausedUntil(performance.now() + 1800);

    if (variant === "snap") {
      wheelBucketRef.current += delta * multiplier;
      if (Math.abs(wheelBucketRef.current) > 72) {
        phaseRef.current = normalizePhase(phaseRef.current + Math.sign(wheelBucketRef.current) * STEP);
        wheelBucketRef.current = 0;
      }
      return;
    }

    if (variant === "scrub") {
      phaseRef.current = normalizePhase(phaseRef.current + delta * multiplier * 0.00092);
      scheduleSoftSnap();
      return;
    }

    phaseRef.current = normalizePhase(phaseRef.current + delta * multiplier * 0.00072);
    velocityRef.current += delta * multiplier * 0.0008;
    velocityRef.current = clamp(velocityRef.current, -0.9, 0.9);
    scheduleSoftSnap();
  }

  function step(direction: -1 | 1) {
    setPausedUntil(performance.now() + 1800);
    phaseRef.current = normalizePhase(phaseRef.current + direction * STEP);
  }

  function scheduleSoftSnap() {
    if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
    idleTimerRef.current = window.setTimeout(() => {
      if (variant === "scrub") {
        phaseRef.current = snapToNearestSlot(phaseRef.current);
      }
    }, 220);
  }

  const cards = useMemo(
    () =>
      ARTICLES.map((article, index) => ({
        article,
        index,
        pose: coverPose(index, phase, ARTICLES.length)
      })),
    [phase]
  );

  return (
    <section className="gesturePrototypeShell">
      <div className="gesturePrototypeCopy">
        <strong>{variantMeta.label}</strong>
        <span>{variantMeta.note}</span>
        <em>把鼠标移到卡片区域，触摸板左右滑动；也可以按住区域左右拖动。</em>
      </div>

      <section
        className="gesturePlazaCarousel"
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        aria-label={variantMeta.label}
      >
        <div className="gestureDottedPlane" />
        {cards.map(({ article, index, pose }) => (
          <article
            key={article.title}
            className={`gesturePlazaCard ${article.tone}`}
            style={{
              opacity: pose.opacity,
              zIndex: pose.zIndex,
              transform: `translate(-50%, -50%) translateX(${pose.x}px) translateY(${pose.y}px) translateZ(${pose.z}px) rotateY(${pose.rotateY}deg) scale(${pose.scale})`
            }}
            onClick={() => setActiveIndex(index)}
          >
            <div className="plazaCover">
              <div className="plazaCoverTop">
                <span>{article.vendor}</span>
                <span>{article.sourceName}</span>
              </div>
              <h2>{article.title}</h2>
              <p>{article.date}</p>
            </div>
            <div className="plazaCardBody">
              <div className="plazaMeta">
                <span>{article.label}</span>
                <span className={`importance i${article.importance}`}>优先级 {article.importance}</span>
              </div>
              <p>{article.summary}</p>
              <div className="plazaActions">
                <a href="#" onClick={(event) => event.preventDefault()}>
                  <ExternalLink size={14} />
                  原文
                </a>
                <button>
                  <Star size={14} />
                  收藏
                </button>
              </div>
            </div>
          </article>
        ))}
      </section>

      <div className="gestureControls">
        <button onClick={() => step(-1)}>
          <ArrowLeft size={15} />
          上一张
        </button>
        <span>{ARTICLES[activeIndex]?.label ?? "Plaza"} · {activeIndex + 1} / {ARTICLES.length}</span>
        <button onClick={() => step(1)}>
          下一张
          <ArrowRight size={15} />
        </button>
      </div>
    </section>
  );
}

function coverPose(index: number, phase: number, total: number) {
  const raw = index / total - phase;
  const wrapped = ((raw + 0.5) % 1 + 1) % 1 - 0.5;
  const slot = wrapped * total;
  const abs = Math.abs(slot);
  const sign = Math.sign(slot);
  const clamped = Math.min(abs, 3);
  const x = sign * interpolate(clamped, [0, 1, 2, 3], [0, 280, 486, 0]);
  const y = interpolate(clamped, [0, 1, 2, 3], [0, 10, 18, 28]);
  const z = interpolate(clamped, [0, 1, 2, 3], [118, 14, -92, -280]);
  const scale = interpolate(clamped, [0, 1, 2, 3], [1.08, 0.82, 0.6, 0.52]);
  const opacity = interpolate(clamped, [0, 1, 2, 3], [1, 0.9, 0.55, 0.16]);
  const rotateY = sign * interpolate(clamped, [0, 1, 2, 3], [0, -13, -21, 0]);
  return {
    x,
    y,
    z,
    scale,
    opacity,
    rotateY,
    zIndex: Math.max(1, Math.round(8 - abs * 2))
  };
}

function interpolate(value: number, input: number[], output: number[]) {
  for (let index = 0; index < input.length - 1; index += 1) {
    const start = input[index] ?? 0;
    const end = input[index + 1] ?? start;
    if (value >= start && value <= end) {
      const progress = end === start ? 0 : (value - start) / (end - start);
      return (output[index] ?? 0) + progress * ((output[index + 1] ?? 0) - (output[index] ?? 0));
    }
  }
  return output[output.length - 1] ?? 0;
}

function horizontalWheelDelta(event: WheelEvent<HTMLElement>) {
  if (Math.abs(event.deltaX) >= 1) return event.deltaX;
  if (event.shiftKey && Math.abs(event.deltaY) >= 1) return event.deltaY;
  return 0;
}

function nearestIndex(phase: number) {
  return (ARTICLES.length - Math.round(phase / STEP)) % ARTICLES.length;
}

function snapToNearestSlot(phase: number) {
  return normalizePhase(Math.round(phase / STEP) * STEP);
}

function easeTowardNearestSlot(phase: number, amount: number) {
  const target = snapToNearestSlot(phase);
  let delta = target - phase;
  if (delta > 0.5) delta -= 1;
  if (delta < -0.5) delta += 1;
  return normalizePhase(phase + delta * amount);
}

function normalizePhase(value: number) {
  return ((value % 1) + 1) % 1;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
