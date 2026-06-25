import assert from "node:assert/strict";
import test from "node:test";

import { getAggregateNavScope, selectAggregatePreviewItems } from "../src/lib/nav-aggregation";
import type { StoredItem } from "../src/lib/types";

test("aggregate nav scopes map parents to leaf source groups and preview limits", () => {
  const vendors = getAggregateNavScope("vendors");
  const openReview = getAggregateNavScope("papers:openreview");
  const labs = getAggregateNavScope("labs");

  assert.equal(vendors?.perLeaf, 2);
  assert.ok(vendors?.leafGroups.some((group) => group.id === "openai" && group.sourceIds.includes("openai-research-index")));
  assert.ok(vendors?.leafGroups.some((group) => group.id === "qwen-research" && group.sourceIds.includes("qwen-research")));

  assert.equal(openReview?.perLeaf, 3);
  assert.deepEqual(
    openReview?.leafGroups.map((group) => group.id),
    ["openreview-iclr", "openreview-neurips", "openreview-icml", "openreview-colm"]
  );

  assert.ok(labs?.leafGroups.some((group) => group.id === "mila" && group.sourceIds.includes("mila-blog")));
  assert.ok(
    labs?.leafGroups.some((group) => group.id === "vector-institute" && group.sourceIds.includes("vector-publications"))
  );
});

test("aggregate nav scopes expose the current navigation labels", () => {
  assert.equal(getAggregateNavScope("vendors")?.label, "Developers");
  assert.equal(getAggregateNavScope("vendors:first")?.label, "T1");
  assert.equal(getAggregateNavScope("vendors:second")?.label, "T2");
  assert.equal(getAggregateNavScope("coding")?.label, "Coder");
  assert.equal(getAggregateNavScope("labs")?.label, "Labs");
});

test("aggregate preview selects the top items inside each leaf group", () => {
  const scope = {
    id: "test",
    label: "Test",
    perLeaf: 2,
    leafGroups: [
      { id: "openai", label: "OpenAI", sourceIds: ["openai-research-index"] },
      { id: "anthropic", label: "Anthropic", sourceIds: ["anthropic-research"] }
    ]
  };

  const selected = selectAggregatePreviewItems(
    [
      item("openai-low-new", "openai-research-index", 2, "2026-06-20"),
      item("openai-high-old", "openai-research-index", 4, "2026-06-01"),
      item("openai-high-new", "openai-research-index", 4, "2026-06-18"),
      item("anthropic-new", "anthropic-research", 3, "2026-06-19"),
      item("anthropic-old", "anthropic-research", 3, "2026-06-12"),
      item("anthropic-extra", "anthropic-research", 2, "2026-06-20")
    ],
    scope
  );

  assert.deepEqual(
    selected.map((entry) => entry.id),
    ["openai-high-new", "openai-high-old", "anthropic-new", "anthropic-old"]
  );
});

test("aggregate preview sorts huggingface daily papers by submit time desc", () => {
  const scope = {
    id: "papers:huggingface",
    label: "HuggingFace",
    perLeaf: 2,
    leafGroups: [{ id: "hf-daily-papers", label: "Daily Papers", sourceIds: ["huggingface-daily-papers"] }]
  };

  const selected = selectAggregatePreviewItems(
    [
      item("submitted-second-newer-publish", "huggingface-daily-papers", 5, "2026-06-20", 1),
      item("submitted-first-older-publish", "huggingface-daily-papers", 1, "2026-06-01", 0)
    ],
    scope
  );

  assert.deepEqual(
    selected.map((entry) => entry.id),
    ["submitted-second-newer-publish", "submitted-first-older-publish"]
  );
});

test("aggregate preview sorts huggingface trending papers by submit time desc", () => {
  const scope = {
    id: "papers:huggingface",
    label: "HuggingFace",
    perLeaf: 3,
    leafGroups: [{ id: "hf-trending-papers", label: "Trending Papers", sourceIds: ["huggingface-trending-papers"] }]
  };

  const selected = selectAggregatePreviewItems(
    [
      item("first-on-page", "huggingface-trending-papers", 5, "2026-06-20", 0),
      item("third-on-page", "huggingface-trending-papers", 1, "2026-06-01", 2),
      item("second-on-page", "huggingface-trending-papers", 3, "2026-06-10", 1)
    ],
    scope
  );

  assert.deepEqual(
    selected.map((entry) => entry.id),
    ["first-on-page", "second-on-page", "third-on-page"]
  );
});

function item(
  id: string,
  sourceId: string,
  importance: number,
  publishedAt: string,
  sourceOrder: number | null = null
): StoredItem {
  return {
    id,
    sourceId,
    sourceName: sourceId,
    vendor: sourceId.includes("openai") ? "OpenAI" : "Anthropic",
    sourceCategory: "research",
    title: id,
    canonicalUrl: `https://example.com/${id}`,
    publishedAt,
    submittedAt: null,
    excerpt: null,
    content: null,
    summary: null,
    whyItMatters: null,
    action: null,
    tags: ["research"],
    importance,
    readAt: null,
    starred: false,
    isNewSinceBrief: false,
    sourceOrder,
    createdAt: "2026-06-01T00:00:00.000Z"
  };
}
