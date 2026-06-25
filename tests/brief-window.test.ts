import assert from "node:assert/strict";
import test from "node:test";

import { briefWindowStart, isBaselineDue, msUntilNextFetchSlot } from "../src/lib/brief-window";

test("brief window starts at today's 7 AM after baseline time", () => {
  const start = briefWindowStart(new Date("2026-06-18T09:15:00+08:00"));

  assert.equal(start.toISOString(), new Date("2026-06-18T07:00:00+08:00").toISOString());
});

test("brief window starts at previous day's 7 AM before baseline time", () => {
  const start = briefWindowStart(new Date("2026-06-18T06:30:00+08:00"));

  assert.equal(start.toISOString(), new Date("2026-06-17T07:00:00+08:00").toISOString());
});

test("baseline is due when the stored baseline is older than the current window", () => {
  assert.equal(
    isBaselineDue({
      now: new Date("2026-06-18T07:05:00+08:00"),
      lastBaselineAt: new Date("2026-06-17T07:10:00+08:00").toISOString()
    }),
    true
  );
});

test("baseline is not due when it already ran for the current window", () => {
  assert.equal(
    isBaselineDue({
      now: new Date("2026-06-18T08:05:00+08:00"),
      lastBaselineAt: new Date("2026-06-18T07:03:00+08:00").toISOString()
    }),
    false
  );
});

test("next fetch slot aligns to half-hour intervals", () => {
  const delay = msUntilNextFetchSlot(new Date("2026-06-18T07:12:00.000Z"), 30);

  assert.equal(delay, 18 * 60 * 1000);
});
