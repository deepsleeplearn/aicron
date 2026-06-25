import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboardSource = readFileSync("src/components/dashboard.tsx", "utf8");
const dashboardCss = readFileSync("src/app/globals.css", "utf8");

test("today badge renders in coverflow cards and list items without absolute positioning", () => {
  assert.match(dashboardSource, /function TodayBadge\(\)/);
  assert.match(dashboardSource, /isCurrentLocalItemDate/);
  assert.match(dashboardSource, /<i className="todayBadgeDot"/);

  const todayBadgeUses = dashboardSource.match(/\{isTodayItem\(item\) \? <TodayBadge \/> : null\}/g)?.length ?? 0;
  assert.equal(todayBadgeUses, 2);

  const todayBadgeBlock = dashboardCss.match(/\.todayBadge\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
  assert.match(todayBadgeBlock, /display:\s*inline-flex/);
  assert.doesNotMatch(todayBadgeBlock, /position:\s*absolute/);

  const coverTodayBadgeBlock = dashboardCss.match(/\.plazaCoverTop \.todayBadge\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
  assert.match(coverTodayBadgeBlock, /max-width:\s*none/);
  assert.match(coverTodayBadgeBlock, /overflow:\s*visible/);
});
