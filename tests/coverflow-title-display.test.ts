import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboardCss = readFileSync("src/app/globals.css", "utf8");

test("coverflow card titles are not line-clamped", () => {
  for (const selector of [".plazaCover h2", ".coverflowCard h2", ".coverflowCard.compact h2"]) {
    assert.doesNotMatch(cssBlock(selector), /-webkit-line-clamp\s*:/);
  }
});

test("coverflow summaries remain allowed to truncate", () => {
  assert.match(cssBlock(".plazaSummary"), /-webkit-line-clamp\s*:/);
  assert.match(cssBlock(".coverflowCard p"), /-webkit-line-clamp\s*:/);
});

test("coverflow titles stay prominent without creating one-line title gaps", () => {
  assert.match(cssBlock(".plazaCover h2"), /font-size:\s*2[0-9]px/);
  assert.doesNotMatch(cssBlock(".plazaCover p"), /margin:\s*auto\s+0\s+0/);
});

function cssBlock(selector: string) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = dashboardCss.match(new RegExp(`${escapedSelector}(?:\\s*,[^{}]*)?\\s*\\{([\\s\\S]*?)\\n\\}`));
  assert.ok(match, `Expected CSS block for ${selector}`);
  return match[1] ?? "";
}
