import assert from "node:assert/strict";
import test from "node:test";

import { computeItemHash, normalizeTitle, rankItem } from "../src/lib/normalization";

test("normalizes titles for dedupe without erasing meaning", () => {
  assert.equal(normalizeTitle("  Responses API:   New Image Results\n"), "responses api new image results");
});

test("hash is stable for same source, url, and normalized title", () => {
  const first = computeItemHash({
    sourceId: "openai-news",
    canonicalUrl: "https://openai.com/news/example?utm_source=rss",
    title: "New model release"
  });
  const second = computeItemHash({
    sourceId: "openai-news",
    canonicalUrl: "https://openai.com/news/example",
    title: " new   model release "
  });

  assert.equal(first, second);
});

test("ranking prioritizes breaking API and model releases", () => {
  const ranked = rankItem({
    title: "Responses API breaking change for tool calls",
    summary: "Migration required before July.",
    categories: ["api"],
    sourceCategory: "api"
  });

  assert.equal(ranked.importance, 5);
  assert.ok(ranked.tags.includes("api"));
  assert.ok(ranked.tags.includes("breaking-change"));
});

test("generic release wording does not imply a model update", () => {
  const ranked = rankItem({
    title: "Codex Release 1.2.3",
    summary: "Fixed typos and bumped dependencies.",
    categories: ["coding-agent"],
    sourceCategory: "coding-agent"
  });

  assert.equal(ranked.importance, 3);
  assert.ok(ranked.tags.includes("coding-agent"));
  assert.equal(ranked.tags.includes("model"), false);
});

test("ranking keeps supported source category labels visible as tags", () => {
  const ranked = rankItem({
    title: "M*: A Modular Serving System for Multimodal Models",
    summary: "A Stanford AI Lab post about serving multimodal models.",
    categories: ["Stanford AI Lab", "NLP", "Machine Learning"],
    sourceCategory: "research"
  });

  assert.ok(ranked.tags.includes("research"));
  assert.ok(ranked.tags.includes("NLP"));
  assert.ok(ranked.tags.includes("Machine Learning"));
  assert.equal(ranked.tags.includes("Stanford AI Lab"), false);
});
