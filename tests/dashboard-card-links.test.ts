import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboardCss = readFileSync("src/app/globals.css", "utf8");

test("clickable dashboard cards let inline markdown links fall through to the card", () => {
  const expectedSelectors = [
    ".feedItem h2 .inlineRichText a",
    ".feedSummary .inlineRichText a",
    ".plazaCover h2 .inlineRichText a",
    ".plazaSummary .inlineRichText a",
    ".githubRepoCard h2 .inlineRichText a",
    ".githubDescription .inlineRichText a"
  ];

  for (const selector of expectedSelectors) {
    assert.match(dashboardCss, new RegExp(`${escapeRegExp(selector)}[\\s\\S]*?pointer-events:\\s*none`));
  }
});

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
