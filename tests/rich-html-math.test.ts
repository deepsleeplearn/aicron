import assert from "node:assert/strict";
import test from "node:test";

import { renderMathInRichHtml } from "../src/lib/rich-html-math";

test("renders inline and display math in rich html article text", () => {
  const html = [
    "<article>",
    "<p>Pretraining gradient, \\(g_{\\rm pre}\\), and downstream gradient.</p>",
    "<p>$$L_{\\rm down}(\\theta-\\eta g_{\\rm pre})\\approx L_{\\rm down}(\\theta) - \\eta g_{\\rm down}^{\\top} g_{\\rm pre}$$</p>",
    "</article>"
  ].join("");

  const rendered = renderMathInRichHtml(html);

  assert.match(rendered, /class="katex"/);
  assert.match(rendered, /class="katex-display"/);
  assert.doesNotMatch(rendered, /\\\(g_\{\\rm pre\}\\\)/);
  assert.doesNotMatch(rendered, /\$\$L_\{\\rm down\}/);
  assert.match(rendered, /<article>/);
  assert.match(rendered, /<\/article>/);
});

test("does not render math delimiters inside code or pre blocks", () => {
  const html = "<article><p>Use \\(x_i\\).</p><pre>keep \\(x_i\\)</pre><code>keep $$x_i$$</code></article>";

  const rendered = renderMathInRichHtml(html);

  assert.match(rendered, /class="katex"/);
  assert.match(rendered, /<pre>keep \\\(x_i\\\)<\/pre>/);
  assert.match(rendered, /<code>keep \$\$x_i\$\$<\/code>/);
});
