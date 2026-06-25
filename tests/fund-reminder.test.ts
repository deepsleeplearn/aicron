import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { isFundReminderActive } from "../src/lib/fund-reminder";

const dashboardSource = readFileSync("src/components/dashboard.tsx", "utf8");
const dashboardCss = readFileSync("src/app/globals.css", "utf8");
const requirements = readFileSync("docs/PROJECT_REQUIREMENTS.md", "utf8");

test("fund transaction reminder is active only on Shanghai workdays between 14:45 and 15:00", () => {
  assert.equal(isFundReminderActive(new Date("2026-06-24T14:44:59+08:00")), false);
  assert.equal(isFundReminderActive(new Date("2026-06-24T14:45:00+08:00")), true);
  assert.equal(isFundReminderActive(new Date("2026-06-24T14:59:59+08:00")), true);
  assert.equal(isFundReminderActive(new Date("2026-06-24T15:00:00+08:00")), false);
  assert.equal(isFundReminderActive(new Date("2026-06-27T14:50:00+08:00")), false);
});

test("dashboard header includes a narrow scrolling fund reminder topbar", () => {
  assert.match(dashboardSource, /const fundReminderActive = isFundReminderActive\(currentTime\)/);
  assert.match(dashboardSource, /<div className="fundReminderTopBar" role="status"/);
  assert.match(dashboardSource, /Pay attention to the timing of fund transactions/);
  assert.match(dashboardSource, /<div className="topNavInner">/);
  assert.ok(dashboardSource.indexOf("fundReminderTopBar") < dashboardSource.indexOf("topNavInner"));

  assert.match(dashboardCss, /\.fundReminderTopBar\s*\{[^}]*height:\s*26px/s);
  assert.match(dashboardCss, /\.fundReminderTopBar\s*\{[^}]*color:\s*#d92d20/s);
  assert.match(dashboardCss, /\.fundReminderTrack\s*\{[^}]*animation:\s*fundReminderMarquee/s);
  assert.match(dashboardCss, /@keyframes fundReminderMarquee/);
});

test("requirements document records the fund reminder topbar behavior", () => {
  assert.match(requirements, /Header 最上方/);
  assert.match(requirements, /14:45-15:00/);
  assert.match(requirements, /Pay attention to the timing of fund transactions/);
});
