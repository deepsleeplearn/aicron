import assert from "node:assert/strict";
import test from "node:test";

import { selectLatestPerPlazaGroup } from "../src/lib/plaza";
import type { StoredItem } from "../src/lib/types";

test("plaza selects the newest item from each non-github leaf group", () => {
  const items = [
    item("old-openai", "openai-research-index", "OpenAI", "2026-06-17T07:00:00.000Z"),
    item("new-openai", "openai-research-index", "OpenAI", "2026-06-18T07:00:00.000Z"),
    item("qwen-blog", "qwen-blog-rss", "Qwen", "2026-06-18T06:00:00.000Z"),
    item("github", "github-trending", "GitHub", "2026-06-18T09:00:00.000Z"),
    item("codex", "openai-codex-blog", "OpenAI", "2026-06-18T08:00:00.000Z"),
    item("mila", "mila-blog", "Mila", "2026-06-18T08:30:00.000Z"),
    item("vector", "vector-publications", "Vector Institute", "2026-06-18T08:45:00.000Z"),
    item("old-siam", "siam-sisc", "SIAM", "2026-06-18T08:15:00.000Z"),
    item("new-siam", "siam-sisc", "SIAM", "2026-06-18T09:15:00.000Z"),
    item("jmlr", "jmlr-papers", "JMLR", "2026-06-18T09:00:00.000Z")
  ];

  assert.deepEqual(
    selectLatestPerPlazaGroup(items).map((entry) => entry.id),
    ["new-siam", "jmlr", "vector", "mila", "codex", "new-openai", "qwen-blog"]
  );
});

function item(
  id: string,
  sourceId: string,
  vendor: string,
  publishedAt: string
): StoredItem {
  return {
    id,
    sourceId,
    sourceName: sourceId,
    vendor,
    sourceCategory: sourceId === "github-trending" ? "github-trending" : "research",
    title: id,
    canonicalUrl: `https://example.com/${id}`,
    publishedAt,
    submittedAt: null,
    excerpt: id,
    content: null,
    summary: id,
    whyItMatters: id,
    action: id,
    tags: ["research"],
    importance: 3,
    readAt: null,
    starred: false,
    isNewSinceBrief: false,
    sourceOrder: null,
    createdAt: publishedAt
  };
}
