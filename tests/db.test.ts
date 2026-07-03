import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { computeItemHash } from "../src/lib/normalization";
import { encodeRichHtmlContent } from "../src/lib/rich-content";
import type { Source } from "../src/lib/types";

test("upsert merges same source and URL even when title changes", async () => {
  const projectDir = mkdtempSync(path.join(tmpdir(), "ai-brief-db-"));
  process.chdir(projectDir);

  const { listItems, upsertItem } = await import("../src/lib/db");
  const source: Source = {
    id: "openai-news",
    name: "OpenAI News",
    vendor: "OpenAI",
    category: "news",
    type: "rss",
    url: "https://openai.com/news/rss.xml",
    enabled: true
  };
  const canonicalUrl = "https://openai.com/news/example";

  upsertItem({
    id: computeItemHash({ sourceId: source.id, canonicalUrl, title: "Initial title" }),
    source,
    title: "Initial title",
    canonicalUrl,
    excerpt: "Initial excerpt",
    importance: 2,
    tags: ["news"],
    summary: "Initial summary",
    whyItMatters: "Initial reason",
    action: "Initial action"
  });

  upsertItem({
    id: computeItemHash({ sourceId: source.id, canonicalUrl, title: "Updated title" }),
    source,
    title: "Updated title",
    canonicalUrl,
    excerpt: "Updated excerpt",
    importance: 3,
    tags: ["news", "model"],
    summary: "Updated summary",
    whyItMatters: "Updated reason",
    action: "Updated action"
  });

  const items = listItems({ sourceIds: [source.id] });

  assert.equal(items.length, 1);
  assert.equal(items[0]?.title, "Updated title");
  assert.equal(items[0]?.summary, "Updated summary");
  assert.deepEqual(items[0]?.tags, ["news", "model"]);
});

test("upsert keeps fuller article content when a later refresh only has an excerpt", async () => {
  const { getItem, upsertItem } = await import("../src/lib/db");
  const source: Source = {
    id: "openai-codex-blog",
    name: "Codex Blog",
    vendor: "OpenAI",
    category: "coding-agent",
    type: "openai-developers-blog",
    url: "https://developers.openai.com/blog",
    enabled: true
  };
  const canonicalUrl = "https://developers.openai.com/blog/designing-delightful-frontends-with-gpt-5-4";
  const id = computeItemHash({
    sourceId: source.id,
    canonicalUrl,
    title: "Designing delightful frontends with GPT-5.4"
  });
  const fullContent = "Full article paragraph. ".repeat(120);

  upsertItem({
    id,
    source,
    title: "Designing delightful frontends with GPT-5.4",
    canonicalUrl,
    excerpt: "Short excerpt.",
    content: fullContent,
    importance: 4,
    tags: ["coding-agent"],
    summary: "Short summary.",
    whyItMatters: "Important",
    action: "Read"
  });

  upsertItem({
    id,
    source,
    title: "Designing delightful frontends with GPT-5.4",
    canonicalUrl,
    excerpt: "Short excerpt.",
    content: "Short excerpt.",
    importance: 4,
    tags: ["coding-agent"],
    summary: "Short summary.",
    whyItMatters: "Important",
    action: "Read"
  });

  assert.equal(getItem(id)?.content, fullContent);
});

test("upsert replaces cached X page content with authoritative twitter-cli post content", async () => {
  const { getItem, upsertItem } = await import("../src/lib/db");
  const source: Source = {
    id: "karpathy-x-posts",
    name: "Andrej Karpathy X Posts",
    vendor: "Andrej Karpathy",
    category: "experts-bloggers",
    type: "twitter-user-posts",
    url: "https://x.com/karpathy",
    enabled: true
  };
  const canonicalUrl = "https://x.com/karpathy/status/2061907337154367865";
  const id = computeItemHash({ sourceId: source.id, canonicalUrl, title: "A harness for every task" });
  const staleXPageShell = encodeRichHtmlContent(`<article>${"X profile avatar navigation chrome. ".repeat(80)}</article>`);
  const cliPostContent = encodeRichHtmlContent("<article><p>A harness for every task.</p><figure><img src=\"https://pbs.twimg.com/media/example.png\" alt=\"photo from @karpathy\" loading=\"lazy\" /></figure></article>");

  upsertItem({
    id,
    source,
    title: "A harness for every task",
    canonicalUrl,
    excerpt: "A harness for every task.",
    content: staleXPageShell,
    importance: 3,
    tags: ["X"],
    summary: "A harness for every task.",
    whyItMatters: "Important",
    action: "Read"
  });

  upsertItem({
    id,
    source,
    title: "A harness for every task",
    canonicalUrl,
    excerpt: "A harness for every task.",
    content: cliPostContent,
    importance: 3,
    tags: ["X"],
    summary: "A harness for every task.",
    whyItMatters: "Important",
    action: "Read"
  });

  assert.equal(getItem(id)?.content, cliPostContent);
});

test("listItems orders by importance first, then submit time before publish time", async () => {
  const { listItems, upsertItem } = await import("../src/lib/db");
  const source: Source = {
    id: "order-test-source",
    name: "Order Test",
    vendor: "Test",
    category: "news",
    type: "rss",
    url: "https://example.com/feed.xml",
    enabled: true
  };

  const rows = [
    { title: "Low newest", importance: 2, publishedAt: "2026-06-18T10:00:00.000Z" },
    { title: "High newer submit", importance: 5, publishedAt: "Jun 17, 2026", submittedAt: "2026-06-19" },
    { title: "High newest", importance: 5, publishedAt: "2026-06-18T09:00:00.000Z" },
    { title: "Medium newest", importance: 4, publishedAt: "2026-06-18T11:00:00.000Z" }
  ];

  for (const row of rows) {
    const canonicalUrl = `https://example.com/${row.title.toLowerCase().replace(/\s+/g, "-")}`;
    upsertItem({
      id: computeItemHash({ sourceId: source.id, canonicalUrl, title: row.title }),
      source,
      title: row.title,
      canonicalUrl,
      publishedAt: row.publishedAt,
      submittedAt: row.submittedAt ?? null,
      excerpt: row.title,
      importance: row.importance,
      tags: ["news"],
      summary: row.title,
      whyItMatters: "Order test",
      action: "Order test"
    });
  }

  assert.deepEqual(
    listItems({ sourceIds: [source.id] }).map((item) => item.title),
    ["High newer submit", "High newest", "Medium newest", "Low newest"]
  );
});

test("listItems exposes source order for source-native ordering", async () => {
  const { listItems, upsertItem } = await import("../src/lib/db");
  const source: Source = {
    id: "source-order-test",
    name: "Source Order Test",
    vendor: "Test",
    category: "research",
    type: "huggingface-papers",
    url: "https://example.com/papers",
    enabled: true
  };

  for (const row of [
    { title: "Submitted first", sourceOrder: 0, publishedAt: "2026-06-01" },
    { title: "Submitted second", sourceOrder: 1, publishedAt: "2026-06-20" }
  ]) {
    const canonicalUrl = `https://example.com/${row.title.toLowerCase().replace(/\s+/g, "-")}`;
    upsertItem({
      id: computeItemHash({ sourceId: source.id, canonicalUrl, title: row.title }),
      source,
      title: row.title,
      canonicalUrl,
      publishedAt: row.publishedAt,
      sourceOrder: row.sourceOrder,
      excerpt: row.title,
      importance: 3,
      tags: ["research"],
      summary: row.title,
      whyItMatters: "Source order test",
      action: "Source order test"
    });
  }

  assert.deepEqual(
    listItems({ sourceIds: [source.id] })
      .sort((a, b) => (a.sourceOrder ?? 999) - (b.sourceOrder ?? 999))
      .map((item) => [item.title, item.sourceOrder]),
    [
      ["Submitted first", 0],
      ["Submitted second", 1]
    ]
  );
});

test("listItems applies source filtering before global row limits", async () => {
  const { listItems, upsertItem } = await import("../src/lib/db");
  const fillerSource: Source = {
    id: "filler-source",
    name: "Filler Source",
    vendor: "Filler",
    category: "news",
    type: "rss",
    url: "https://example.com/filler.xml",
    enabled: true
  };
  const targetSource: Source = {
    id: "target-source-filter-before-limit",
    name: "Target Source",
    vendor: "Target",
    category: "research",
    type: "rss",
    url: "https://example.com/target.xml",
    enabled: true
  };

  for (let index = 0; index < 510; index += 1) {
    const title = `Filler item ${index}`;
    const canonicalUrl = `https://example.com/filler/${index}`;
    upsertItem({
      id: computeItemHash({ sourceId: fillerSource.id, canonicalUrl, title }),
      source: fillerSource,
      title,
      canonicalUrl,
      publishedAt: `2026-06-18T${String(index % 24).padStart(2, "0")}:00:00.000Z`,
      excerpt: title,
      importance: 5,
      tags: ["news", "model"],
      summary: title,
      whyItMatters: title,
      action: title
    });
  }

  for (let index = 0; index < 12; index += 1) {
    const title = `Target item ${index}`;
    const canonicalUrl = `https://example.com/target/${index}`;
    upsertItem({
      id: computeItemHash({ sourceId: targetSource.id, canonicalUrl, title }),
      source: targetSource,
      title,
      canonicalUrl,
      publishedAt: `2026-05-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`,
      excerpt: title,
      importance: 1,
      tags: ["research"],
      summary: title,
      whyItMatters: title,
      action: title
    });
  }

  assert.equal(listItems({ sourceIds: [targetSource.id] }).length, 12);
});

test("items created after the current brief baseline are flagged as new", async () => {
  const { getItem, setBriefBaselineAt, upsertItem } = await import("../src/lib/db");
  const source: Source = {
    id: "new-marker-source",
    name: "New Marker Source",
    vendor: "Test",
    category: "news",
    type: "rss",
    url: "https://example.com/new-marker.xml",
    enabled: true
  };
  const canonicalUrl = "https://example.com/new-marker";

  upsertItem({
    id: computeItemHash({ sourceId: source.id, canonicalUrl, title: "New marker" }),
    source,
    title: "New marker",
    canonicalUrl,
    excerpt: "New marker",
    importance: 3,
    tags: ["news"],
    summary: "New marker",
    whyItMatters: "New marker",
    action: "New marker"
  });

  const createdAt = getItem(computeItemHash({ sourceId: source.id, canonicalUrl, title: "New marker" }))?.createdAt;
  assert.ok(createdAt);

  setBriefBaselineAt(new Date(Date.parse(createdAt) - 1000).toISOString());
  assert.equal(getItem(computeItemHash({ sourceId: source.id, canonicalUrl, title: "New marker" }))?.isNewSinceBrief, true);

  setBriefBaselineAt(new Date(Date.parse(createdAt) + 1000).toISOString());
  assert.equal(getItem(computeItemHash({ sourceId: source.id, canonicalUrl, title: "New marker" }))?.isNewSinceBrief, false);
});

test("removed DeepSeek source and stored items are hidden", async () => {
  const { listItems, listSources, upsertItem } = await import("../src/lib/db");
  const source: Source = {
    id: "deepseek-news",
    name: "DeepSeek News",
    vendor: "DeepSeek",
    category: "model",
    type: "html-list",
    url: "https://www.deepseek.com/news",
    enabled: true
  };
  const canonicalUrl = "https://www.deepseek.com/news/example";

  upsertItem({
    id: computeItemHash({ sourceId: source.id, canonicalUrl, title: "DeepSeek example" }),
    source,
    title: "DeepSeek example",
    canonicalUrl,
    excerpt: "DeepSeek example",
    importance: 3,
    tags: ["model"],
    summary: "DeepSeek example",
    whyItMatters: "DeepSeek example",
    action: "DeepSeek example"
  });

  assert.equal(listSources().some((entry) => entry.id === "deepseek-news"), false);
  assert.equal(listItems({ sourceIds: ["deepseek-news"] }).length, 0);
  assert.equal(listItems().some((item) => item.sourceId === "deepseek-news"), false);
});

test("assistant history is preserved by source and canonical URL across item recreation", async () => {
  const {
    appendAssistantExchange,
    getAssistantMessages,
    removeSourceItemsExcept,
    upsertItem
  } = await import("../src/lib/db");
  const source: Source = {
    id: "assistant-history-source",
    name: "Assistant History Source",
    vendor: "Test",
    category: "research",
    type: "rss",
    url: "https://example.com/assistant-history.xml",
    enabled: true
  };
  const canonicalUrl = "https://example.com/articles/permanent-history";
  const firstId = computeItemHash({ sourceId: source.id, canonicalUrl, title: "Permanent history" });

  upsertItem({
    id: firstId,
    source,
    title: "Permanent history",
    canonicalUrl,
    excerpt: "Permanent history",
    importance: 3,
    tags: ["research"],
    summary: "Permanent history",
    whyItMatters: "Permanent history",
    action: "Permanent history"
  });
  appendAssistantExchange({
    itemId: firstId,
    mode: "codex",
    userMessage: "总结一下",
    assistantMessage: "这是总结"
  });

  removeSourceItemsExcept(source.id, ["https://example.com/articles/another"]);

  const secondId = computeItemHash({ sourceId: source.id, canonicalUrl, title: "Permanent history updated" });
  upsertItem({
    id: secondId,
    source,
    title: "Permanent history updated",
    canonicalUrl,
    excerpt: "Permanent history updated",
    importance: 4,
    tags: ["research", "model"],
    summary: "Permanent history updated",
    whyItMatters: "Permanent history updated",
    action: "Permanent history updated"
  });

  assert.deepEqual(getAssistantMessages({ itemId: secondId, mode: "codex" }), [
    { role: "user", content: "总结一下" },
    { role: "assistant", content: "这是总结" }
  ]);
});
