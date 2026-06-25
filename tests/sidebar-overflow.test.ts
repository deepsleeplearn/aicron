import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboardCss = readFileSync("src/app/globals.css", "utf8");

test("left sidebar navigation scroll range ends at the oil widget top edge", () => {
  assert.match(dashboardCss, /--side-oil-height:\s*112px/);
  assert.match(dashboardCss, /--side-oil-bottom:\s*88px/);
  assert.match(
    dashboardCss,
    /\.leftRail\s*\{[^}]*height:\s*calc\(100svh - var\(--left-rail-top\) - var\(--side-oil-bottom\) - var\(--side-oil-height\)\)/s
  );
  assert.match(dashboardCss, /\.leftRail\s*\{[^}]*overflow:\s*visible/s);
  assert.match(dashboardCss, /\.navRail\s*\{[^}]*overflow-y:\s*auto/s);
  assert.match(dashboardCss, /\.navRail\s*\{[^}]*max-height:\s*100%/s);
  assert.match(dashboardCss, /\.sideOilAmbient\s*\{[^}]*height:\s*var\(--side-oil-height\)/s);
});
