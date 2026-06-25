import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboardSource = readFileSync("src/components/dashboard.tsx", "utf8");
const dashboardCss = readFileSync("src/app/globals.css", "utf8");

test("list pagination exposes a direct page jump form", () => {
  assert.match(dashboardSource, /function handlePageJumpSubmit/);
  assert.match(dashboardSource, /className="paginationJump"/);
  assert.match(dashboardSource, /aria-label="跳转页码"/);
  assert.match(dashboardSource, /Math\.min\(data\.pagination\.totalPages/);
});

test("direct page jump control has dedicated compact styling", () => {
  assert.match(dashboardCss, /\.paginationJump/);
  assert.match(dashboardCss, /\.paginationJump input/);
}
);
