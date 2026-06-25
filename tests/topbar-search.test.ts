import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { computeItemHash } from "../src/lib/normalization";
import type { Source } from "../src/lib/types";

const dashboardSource = readFileSync("src/components/dashboard.tsx", "utf8");
const dashboardCss = readFileSync("src/app/globals.css", "utf8");
const itemsRouteSource = readFileSync("src/app/api/items/route.ts", "utf8");

test("title search only matches item titles case-insensitively", async () => {
  const projectDir = mkdtempSync(path.join(tmpdir(), "ai-brief-title-search-"));
  process.chdir(projectDir);

  const { searchItemsByTitle, upsertItem } = await import("../src/lib/db");
  const source: Source = {
    id: "title-search-source",
    name: "Title Search Source",
    vendor: "Search",
    category: "research",
    type: "rss",
    url: "https://example.com/title-search.xml",
    enabled: true
  };

  for (const title of ["Agentic Retrieval", "agent planning systems", "Unrelated Result"]) {
    const canonicalUrl = `https://example.com/${title.toLowerCase().replace(/\s+/g, "-")}`;
    upsertItem({
      id: computeItemHash({ sourceId: source.id, canonicalUrl, title }),
      source,
      title,
      canonicalUrl,
      publishedAt: "2026-06-20T08:00:00.000Z",
      excerpt: title,
      importance: 3,
      tags: ["research"],
      summary: title === "Unrelated Result" ? "Agent appears only in summary" : title,
      whyItMatters: "Search test",
      action: "Search test"
    });
  }

  assert.deepEqual(
    searchItemsByTitle({ q: "AGENT" }).map((item) => item.title).sort(),
    ["Agentic Retrieval", "agent planning systems"]
  );
});

test("title search ranks case-sensitive matches by earliest query character", async () => {
  const projectDir = mkdtempSync(path.join(tmpdir(), "ai-brief-title-search-rank-"));
  process.chdir(projectDir);

  const { searchItemsByTitle, upsertItem } = await import("../src/lib/db");
  const source: Source = {
    id: "title-search-rank-source",
    name: "Title Search Rank Source",
    vendor: "Search",
    category: "research",
    type: "rss",
    url: "https://example.com/title-search-rank.xml",
    enabled: true
  };

  for (const title of ["zx match", "zX match", "Zx match", "ZX match"]) {
    const canonicalUrl = `https://example.com/${title.replace(/\s+/g, "-")}`;
    upsertItem({
      id: computeItemHash({ sourceId: source.id, canonicalUrl, title }),
      source,
      title,
      canonicalUrl,
      publishedAt: "2026-06-20T08:00:00.000Z",
      excerpt: title,
      importance: 3,
      tags: ["research"],
      summary: title,
      whyItMatters: "Search rank test",
      action: "Search rank test"
    });
  }

  assert.deepEqual(
    searchItemsByTitle({ q: "ZX" })
      .map((item) => item.title),
    ["ZX match", "Zx match", "zX match", "zx match"]
  );
});

test("top bar search uses a paged all-library title search and opens details from results", () => {
  assert.match(dashboardSource, /className="topSearch"/);
  assert.match(dashboardSource, /aria-label="搜索文章或代码库标题"/);
  assert.match(dashboardSource, /params\.set\("view", "search"\)/);
  assert.match(dashboardSource, /params\.set\("page", String\(searchPage\)\)/);
  assert.match(dashboardSource, /void selectItem\(item\)/);
  assert.match(itemsRouteSource, /view === "search"/);
  assert.match(itemsRouteSource, /const pageSize = PAGE_SIZE/);
  assert.match(dashboardCss, /\.topSearchResults/);
  assert.match(dashboardCss, /\.topSearchResultButton/);
});

test("top bar search suggestions select on pointer down before focus changes close the dropdown", () => {
  assert.match(dashboardSource, /function handleSearchResultPointerDown/);
  assert.match(dashboardSource, /event\.preventDefault\(\)/);
  assert.match(dashboardSource, /onPointerDown=\{\(event\) => handleSearchResultPointerDown\(event, item\)\}/);
  assert.match(dashboardSource, /onKeyDown=\{\(event\) => handleSearchResultKeyDown\(event, item\)\}/);
});

test("top bar search suggestions align to the input as one combobox", () => {
  assert.match(dashboardCss, /\.topSearch\s*\{[^}]*position:\s*relative/s);
  assert.match(dashboardCss, /\.topSearchResults\s*\{[^}]*right:\s*0/s);
  assert.match(dashboardCss, /\.topSearchResults\s*\{[^}]*left:\s*0/s);
  assert.match(dashboardCss, /\.topSearchResults\s*\{[^}]*width:\s*100%/s);
});
