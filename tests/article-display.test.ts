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

test("expert X posts display their short complete post body", () => {
  assert.equal(
    hasDisplayableArticleContent({
      sourceId: "karpathy-x-posts",
      content: "This is a complete X post body with a linked image and metrics.",
      summary: "This is a complete X post body with a linked image and metrics.",
      excerpt: "This is a complete X post body with a linked image and metrics."
    }),
    true
  );

  assert.equal(
    hasDisplayableArticleContent({
      sourceId: "raschka-x-posts",
      content: "A complete Sebastian Raschka X post with a link to a blog article.",
      summary: "A complete Sebastian Raschka X post with a link to a blog article.",
      excerpt: "A complete Sebastian Raschka X post with a link to a blog article."
    }),
    true
  );

  assert.equal(
    hasDisplayableArticleContent({
      sourceId: "boris-cherny-x-posts",
      content: "A complete Boris Cherny X post about Claude Code and product engineering.",
      summary: "A complete Boris Cherny X post about Claude Code and product engineering.",
      excerpt: "A complete Boris Cherny X post about Claude Code and product engineering."
    }),
    true
  );

  assert.equal(
    hasDisplayableArticleContent({
      sourceId: "alphaxiv-x-posts",
      content: "A complete alphaXiv X post summarizing a recent arXiv paper with a figure.",
      summary: "A complete alphaXiv X post summarizing a recent arXiv paper with a figure.",
      excerpt: "A complete alphaXiv X post summarizing a recent arXiv paper with a figure."
    }),
    true
  );

  assert.equal(
    hasDisplayableArticleContent({
      sourceId: "anatoli-kopadze-x-posts",
      content: "A complete Anatoli Kopadze X post about Claude Code loops with a video.",
      summary: "A complete Anatoli Kopadze X post about Claude Code loops with a video.",
      excerpt: "A complete Anatoli Kopadze X post about Claude Code loops with a video."
    }),
    true
  );

  assert.equal(
    hasDisplayableArticleContent({
      sourceId: "lilian-weng-x-posts",
      content: "A complete Lilian Weng X post about scaling laws and AI safety research.",
      summary: "A complete Lilian Weng X post about scaling laws and AI safety research.",
      excerpt: "A complete Lilian Weng X post about scaling laws and AI safety research."
    }),
    true
  );
});
