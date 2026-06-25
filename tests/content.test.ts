import assert from "node:assert/strict";
import test from "node:test";

import {
  extractReadableHtmlFromHtml,
  extractReadableTextFromHtml,
  knownContentSourceForUrl,
  shouldRefreshArticleContent,
  shouldUpgradePlainArticleContent
} from "../src/lib/content";
import { decodeRichHtmlContent, encodeRichHtmlContent, isRichHtmlContent } from "../src/lib/rich-content";

test("article content refreshes when stored content is only a long summary", () => {
  assert.equal(
    shouldRefreshArticleContent({
      content: "This is a long RSS summary. ".repeat(24),
      summary: "This is a long RSS summary. ".repeat(22),
      excerpt: "This is a long RSS summary. ".repeat(20)
    }),
    true
  );
});

test("article content does not refresh when stored content is clearly fuller than summary", () => {
  assert.equal(
    shouldRefreshArticleContent({
      content: "Full article paragraph. ".repeat(90),
      summary: "Short summary. ".repeat(8),
      excerpt: "Short excerpt. ".repeat(6)
    }),
    false
  );
});

test("rich html article content does not refresh just because metadata excerpt is long", () => {
  assert.equal(
    shouldRefreshArticleContent({
      content: encodeRichHtmlContent(`<article><p>${"Full publisher article body. ".repeat(28)}</p></article>`),
      summary: "Short summary.",
      excerpt: "Author One and Author Two and Author Three and Author Four. ".repeat(25)
    }),
    false
  );
});

test("vector publications do not refresh external article content", () => {
  assert.equal(
    shouldRefreshArticleContent({
      sourceId: "vector-publications",
      content: null,
      summary: "Short summary.",
      excerpt: "Author One and Author Two"
    }),
    false
  );
});

test("plain html articles can be upgraded to rich article content once", () => {
  assert.equal(
    shouldUpgradePlainArticleContent({
      sourceId: "openai-codex-blog",
      canonicalUrl: "https://developers.openai.com/blog/example",
      content: "Full plain text article. ".repeat(80)
    }),
    true
  );

  assert.equal(
    shouldUpgradePlainArticleContent({
      sourceId: "openai-codex-blog",
      canonicalUrl: "https://developers.openai.com/blog/example",
      content: encodeRichHtmlContent("<article><p>Already rich.</p></article>")
    }),
    false
  );

  assert.equal(
    shouldUpgradePlainArticleContent({
      sourceId: "huggingface-daily-papers",
      canonicalUrl: "https://huggingface.co/papers/2606.20515",
      content: "Generated paper abstract. ".repeat(80)
    }),
    false
  );
});

test("vector publication plain detail content is not upgraded to rich html", () => {
  assert.equal(
    shouldUpgradePlainArticleContent({
      sourceId: "vector-publications",
      canonicalUrl: "https://pubs.rsc.org/en/content/articlehtml/2025/fd/d4fd90061h",
      content: "Plain publisher article body. ".repeat(80)
    }),
    false
  );
});

test("pdf-backed articles are not forced into rich html upgrade loops", () => {
  assert.equal(
    shouldUpgradePlainArticleContent({
      sourceId: "openai-research-index",
      canonicalUrl: "https://cdn.openai.com/paper.pdf",
      content: "Extracted PDF text. ".repeat(80)
    }),
    false
  );
});

test("known content source maps OpenAI deployment simulation page to official PDF", () => {
  const source = knownContentSourceForUrl("https://openai.com/index/deployment-simulation/");

  assert.deepEqual(source, {
    url: "https://cdn.openai.com/pdf/predicting-llm-safety-before-release-by-simulating-deployment.pdf",
    type: "pdf"
  });
});

test("html extraction removes page chrome and keeps article text", () => {
  const text = extractReadableTextFromHtml(`
    <html>
      <body>
        <nav>Navigation should not appear</nav>
        <article>
          <h1>Article title</h1>
          <p>First useful paragraph.</p>
          <p>Second useful paragraph.</p>
        </article>
      </body>
    </html>
  `);

  assert.match(text ?? "", /Article title/);
  assert.match(text ?? "", /First useful paragraph/);
  assert.doesNotMatch(text ?? "", /Navigation/);
});

test("html extraction keeps article media and safe structure with absolute image URLs", () => {
  const content = extractReadableHtmlFromHtml(
    `
      <html>
        <body>
          <nav>Navigation should not appear</nav>
          <article>
            <h1>Article title</h1>
            <figure>
              <img src="/images/chart.png" alt="Chart" onclick="alert('x')" />
              <figcaption>Model quality chart.</figcaption>
            </figure>
            <p>Useful paragraph with <a href="/research">a link</a>.</p>
            <script>alert("x")</script>
          </article>
        </body>
      </html>
    `,
    "https://example.com/blog/post"
  );

  assert.ok(content);
  assert.equal(isRichHtmlContent(content), true);
  const html = decodeRichHtmlContent(content ?? "") ?? "";
  assert.match(html, /<figure>/);
  assert.match(html, /src="https:\/\/example.com\/images\/chart.png"/);
  assert.match(html, /alt="Chart"/);
  assert.match(html, /href="https:\/\/example.com\/research"/);
  assert.doesNotMatch(html, /onclick/);
  assert.doesNotMatch(html, /script/);
  assert.doesNotMatch(html, /Navigation/);
});

test("html extraction prefers WordPress post-entry article bodies over sidebar chrome", () => {
  const content = extractReadableHtmlFromHtml(
    `
      <html>
        <body>
          <div class="widget widget_categories">
            <h4>Categories</h4>
            <p>Research Educational</p>
            <p>[instagram-feed num=6]</p>
          </div>
          <aside data="primary-post">
            <div class="post-entry">
              <p>In healthcare settings where patients use LLMs as a medical assistant, performance differs between evaluation and deployment.</p>
              <figure>
                <img src="/wp-content/uploads/2026/06/evaluation.jpg" alt="Evaluation gap" />
                <figcaption>Evaluation and deployment assumptions differ.</figcaption>
              </figure>
              <p>Benchmarks encode assumptions that can break once systems are used interactively.</p>
            </div>
          </aside>
        </body>
      </html>
    `,
    "https://blog.ml.cmu.edu/2026/06/19/example/"
  );

  assert.ok(content);
  const html = decodeRichHtmlContent(content ?? "") ?? "";
  assert.match(html, /healthcare settings/);
  assert.match(html, /src="https:\/\/blog.ml.cmu.edu\/wp-content\/uploads\/2026\/06\/evaluation.jpg"/);
  assert.doesNotMatch(html, /Research Educational/);
  assert.doesNotMatch(html, /instagram-feed/);
});
