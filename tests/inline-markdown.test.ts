import assert from "node:assert/strict";
import test from "node:test";

import { normalizeInlineMarkdownText } from "../src/lib/inline-markdown";

test("normalizes bare superscripts in inline titles", () => {
  assert.equal(normalizeInlineMarkdownText("GD^2PO: Mitigating drift"), "GD²PO: Mitigating drift");
  assert.equal(normalizeInlineMarkdownText("E=mc^2 and x^10"), "E=mc² and x¹⁰");
});

test("keeps delimited latex expressions for katex rendering", () => {
  assert.equal(normalizeInlineMarkdownText("Score $x^2$ vs GD^2PO"), "Score $x^2$ vs GD²PO");
  assert.equal(normalizeInlineMarkdownText("Use \\(g_{\\rm pre}^2\\) here"), "Use \\(g_{\\rm pre}^2\\) here");
});
