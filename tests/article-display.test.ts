import assert from "node:assert/strict";
import test from "node:test";

import { hasDisplayableArticleContent } from "../src/lib/article-display";
import { encodeRichHtmlContent } from "../src/lib/rich-content";

test("normal articles require content that is clearly fuller than the summary", () => {
  assert.equal(
    hasDisplayableArticleContent({
      sourceId: "openai-research-index",
      content: "Short RSS summary.",
      summary: "Short RSS summary.",
      excerpt: "Short RSS summary."
    }),
    false
  );

  assert.equal(
    hasDisplayableArticleContent({
      sourceId: "openai-research-index",
      content: "Full article paragraph. ".repeat(90),
      summary: "Short RSS summary.",
      excerpt: "Short RSS summary."
    }),
    true
  );
});

test("rich html articles display even when metadata excerpts are long", () => {
  assert.equal(
    hasDisplayableArticleContent({
      sourceId: "bair-blog",
      content: encodeRichHtmlContent(`<article><h2>Paper</h2><p>${"Full publisher article body. ".repeat(28)}</p></article>`),
      summary: "Short summary.",
      excerpt: "Author One and Author Two and Author Three and Author Four. ".repeat(25)
    }),
    true
  );
});

test("vector publications do not display cached external article content", () => {
  assert.equal(
    hasDisplayableArticleContent({
      sourceId: "vector-publications",
      content: encodeRichHtmlContent(`<article><h2>Paper</h2><p>${"Full publisher article body. ".repeat(80)}</p></article>`),
      summary: "Short summary.",
      excerpt: "Author One and Author Two"
    }),
    false
  );
});

test("codex changelog entries can display short complete section content", () => {
  assert.equal(
    hasDisplayableArticleContent({
      sourceId: "openai-codex-changelog",
      content: "Codex CLI update with remote executor improvements, authentication changes, and sandbox notes.",
      summary: "Codex CLI update with remote executor improvements.",
      excerpt: "Codex CLI update with remote executor improvements."
    }),
    true
  );
});
