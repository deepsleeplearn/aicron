import assert from "node:assert/strict";
import test from "node:test";

import { extractArxivPaperItems } from "../src/lib/adapters/arxiv-papers";
import { rankItem } from "../src/lib/normalization";
import { getAggregateNavScope } from "../src/lib/nav-aggregation";
import { PLAZA_SOURCE_IDS } from "../src/lib/plaza";
import { DEFAULT_SOURCES } from "../src/lib/sources";

test("arxiv adapter keeps only papers whose primary category matches the source category", () => {
  const items = extractArxivPaperItems({
    sourceId: "arxiv-cs-cl",
    sourceName: "arXiv / cs.CL",
    url: "https://export.arxiv.org/api/query?search_query=cat:cs.CL&sortBy=submittedDate&sortOrder=descending&max_results=50",
    xml: [
      `<?xml version="1.0" encoding="UTF-8"?>`,
      `<feed xmlns="http://www.w3.org/2005/Atom" xmlns:arxiv="http://arxiv.org/schemas/atom">`,
      `<entry>`,
      `<id>http://arxiv.org/abs/2606.12345v2</id>`,
      `<updated>2026-06-20T10:00:00Z</updated>`,
      `<published>2026-06-18T00:00:00Z</published>`,
      `<title>Agentic Large Language Models for Tool Use</title>`,
      `<summary>We study LLM agents with planning and tool use.</summary>`,
      `<author><name>Ada Lovelace</name></author>`,
      `<arxiv:primary_category term="cs.CL" scheme="http://arxiv.org/schemas/atom"/>`,
      `<category term="cs.CL" scheme="http://arxiv.org/schemas/atom"/>`,
      `<category term="cs.AI" scheme="http://arxiv.org/schemas/atom"/>`,
      `<link href="http://arxiv.org/abs/2606.12345v2" rel="alternate" type="text/html"/>`,
      `<link title="pdf" href="http://arxiv.org/pdf/2606.12345v2" rel="related" type="application/pdf"/>`,
      `</entry>`,
      `<entry>`,
      `<id>http://arxiv.org/abs/2606.99999v1</id>`,
      `<updated>2026-06-21T10:00:00Z</updated>`,
      `<published>2026-06-19T00:00:00Z</published>`,
      `<title>Vision Agent Benchmark</title>`,
      `<summary>A multimodal vision agent benchmark.</summary>`,
      `<arxiv:primary_category term="cs.CV" scheme="http://arxiv.org/schemas/atom"/>`,
      `<category term="cs.CL" scheme="http://arxiv.org/schemas/atom"/>`,
      `<category term="cs.CV" scheme="http://arxiv.org/schemas/atom"/>`,
      `</entry>`,
      `</feed>`
    ].join("")
  });

  assert.equal(items.length, 1);
  assert.equal(items[0]?.title, "Agentic Large Language Models for Tool Use");
  assert.equal(items[0]?.canonicalUrl, "https://arxiv.org/abs/2606.12345");
  assert.equal(items[0]?.submittedAt, "2026-06-18T00:00:00Z");
  assert.equal(items[0]?.publishedAt, "2026-06-18T00:00:00Z");
  assert.match(items[0]?.content ?? "", /Authors: Ada Lovelace/);
  assert.match(items[0]?.content ?? "", /PDF: https:\/\/arxiv.org\/pdf\/2606.12345/);
  assert.deepEqual(
    items[0]?.categories,
    ["arXiv", "cs.CL", "cs.AI", "LLM", "Agent", "NLP"]
  );
});

test("arxiv semantic labels pass through to visible tags", () => {
  const ranked = rankItem({
    title: "Agentic Large Language Models for Tool Use",
    summary: "We study LLM agents with planning and tool use.",
    categories: ["arXiv", "cs.CL", "cs.AI", "LLM", "Agent", "NLP"],
    sourceCategory: "research"
  });

  assert.ok(ranked.tags.includes("arXiv"));
  assert.ok(ranked.tags.includes("cs.CL"));
  assert.ok(ranked.tags.includes("LLM"));
  assert.ok(ranked.tags.includes("Agent"));
});

test("arxiv sources appear under Papers arXiv but not Plaza", () => {
  const sourceIds = DEFAULT_SOURCES.map((source) => source.id);
  assert.ok(sourceIds.includes("arxiv-cs-ai"));
  assert.ok(sourceIds.includes("arxiv-cs-lg"));
  assert.ok(sourceIds.includes("arxiv-cs-cl"));
  assert.ok(sourceIds.includes("arxiv-cs-cv"));
  assert.ok(sourceIds.includes("arxiv-cs-ro"));
  assert.ok(sourceIds.includes("arxiv-stat-ml"));

  const arxivScope = getAggregateNavScope("papers:arxiv");
  assert.deepEqual(
    arxivScope?.leafGroups.map((group) => group.id),
    ["arxiv-cs-ai", "arxiv-cs-lg", "arxiv-cs-cl", "arxiv-cs-cv", "arxiv-cs-ro", "arxiv-stat-ml"]
  );

  assert.equal(PLAZA_SOURCE_IDS.has("arxiv-cs-ai"), false);
  assert.equal(PLAZA_SOURCE_IDS.has("arxiv-cs-cl"), false);
});

test("OpenReview conference sources fetch the first fifty targeted accepted papers", () => {
  const expectedSources = [
    {
      id: "openreview-iclr-2026",
      venueId: "ICLR.cc/2026/Conference",
      venue: "ICLR 2026 Oral"
    },
    {
      id: "openreview-neurips-2025",
      venueId: "NeurIPS.cc/2025/Conference",
      venue: "NeurIPS 2025 oral"
    },
    {
      id: "openreview-icml-2025",
      venueId: "ICML.cc/2025/Conference",
      venue: "ICML 2025 oral"
    },
    {
      id: "openreview-colm-2025",
      venueId: "colmweb.org/COLM/2025/Conference",
      venue: "COLM 2025"
    }
  ];

  for (const expected of expectedSources) {
    const source = DEFAULT_SOURCES.find((candidate) => candidate.id === expected.id);
    assert.ok(source);
    const url = new URL(source.url);

    assert.equal(url.hostname, "api2.openreview.net");
    assert.equal(url.pathname, "/notes");
    assert.equal(url.searchParams.get("content.venueid"), expected.venueId);
    assert.equal(url.searchParams.get("content.venue"), expected.venue);
    assert.equal(url.searchParams.get("sort"), "tmdate:desc");
    assert.equal(url.searchParams.get("limit"), "50");
    assert.equal(source.maxItems, 50);
  }
});
