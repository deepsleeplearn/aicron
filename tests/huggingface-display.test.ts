import assert from "node:assert/strict";
import test from "node:test";

import {
  HUGGINGFACE_DAILY_RECENT_DAYS,
  HUGGINGFACE_DAILY_TARGET_ITEMS_PER_DAY,
  huggingFacePaperListUrls,
  selectHuggingFaceDailyItems,
  sortHuggingFaceTrendingItems
} from "../src/lib/huggingface-display";
import { DEFAULT_SOURCES } from "../src/lib/sources";
import type { StoredItem } from "../src/lib/types";

test("daily papers fetch the last seven daily pages", () => {
  assert.deepEqual(
    huggingFacePaperListUrls({
      sourceId: "huggingface-daily-papers",
      url: "https://huggingface.co/papers",
      now: new Date("2026-06-22T12:00:00Z")
    }),
    [
      "https://huggingface.co/papers/date/2026-06-22",
      "https://huggingface.co/papers/date/2026-06-21",
      "https://huggingface.co/papers/date/2026-06-20",
      "https://huggingface.co/papers/date/2026-06-19",
      "https://huggingface.co/papers/date/2026-06-18",
      "https://huggingface.co/papers/date/2026-06-17",
      "https://huggingface.co/papers/date/2026-06-16"
    ]
  );
});

test("daily papers source limit can hold a full recent week", () => {
  const dailySource = DEFAULT_SOURCES.find((source) => source.id === "huggingface-daily-papers");

  assert.equal(
    dailySource?.maxItems,
    HUGGINGFACE_DAILY_RECENT_DAYS * HUGGINGFACE_DAILY_TARGET_ITEMS_PER_DAY
  );
});

test("trending papers keep a single trending list URL", () => {
  assert.deepEqual(
    huggingFacePaperListUrls({
      sourceId: "huggingface-trending-papers",
      url: "https://huggingface.co/papers/trending",
      now: new Date("2026-06-22T12:00:00Z")
    }),
    ["https://huggingface.co/papers/trending"]
  );
});

test("daily papers show the recent week in reverse time order", () => {
  const selected = selectHuggingFaceDailyItems(
    [
      hfItem("old", "huggingface-daily-papers", "2026-06-14", 0),
      hfItem("yesterday-second", "huggingface-daily-papers", "2026-06-21", 1),
      hfItem("today-first", "huggingface-daily-papers", "2026-06-22", 0),
      hfItem("week-start", "huggingface-daily-papers", "2026-06-16", 0),
      hfItem("trending", "huggingface-trending-papers", "2026-06-22", 9)
    ],
    new Date("2026-06-22T12:00:00Z")
  );

  assert.deepEqual(
    selected.map((item) => item.id),
    ["today-first", "yesterday-second", "week-start"]
  );
});

test("trending papers show submit time in reverse", () => {
  const selected = sortHuggingFaceTrendingItems([
    hfItem("first-on-page-newest", "huggingface-trending-papers", "2026-06-22", 0),
    hfItem("third-on-page-oldest", "huggingface-trending-papers", "2026-06-20", 2),
    hfItem("second-on-page-middle", "huggingface-trending-papers", "2026-06-21", 1)
  ]);

  assert.deepEqual(
    selected.map((item) => item.id),
    ["first-on-page-newest", "second-on-page-middle", "third-on-page-oldest"]
  );
});

function hfItem(id: string, sourceId: string, submittedAt: string, sourceOrder: number): StoredItem {
  return {
    id,
    sourceId,
    sourceName: sourceId,
    vendor: "HuggingFace",
    sourceCategory: "research",
    title: id,
    canonicalUrl: `https://huggingface.co/papers/${id}`,
    publishedAt: null,
    submittedAt,
    excerpt: id,
    content: id,
    summary: id,
    whyItMatters: null,
    action: null,
    tags: ["research"],
    importance: 3,
    readAt: null,
    starred: false,
    isNewSinceBrief: false,
    sourceOrder,
    createdAt: `${submittedAt}T00:00:00.000Z`
  };
}
