import assert from "node:assert/strict";
import test from "node:test";

import { mapWithConcurrency } from "../src/lib/concurrency";

test("mapWithConcurrency preserves input order while limiting parallel work", async () => {
  let active = 0;
  let maxActive = 0;

  const results = await mapWithConcurrency([30, 10, 20, 5], 2, async (delayMs, index) => {
    active += 1;
    maxActive = Math.max(maxActive, active);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    active -= 1;
    return `item-${index}`;
  });

  assert.deepEqual(results, ["item-0", "item-1", "item-2", "item-3"]);
  assert.equal(maxActive, 2);
});

test("mapWithConcurrency falls back to one worker for invalid limits", async () => {
  let active = 0;
  let maxActive = 0;

  await mapWithConcurrency([1, 2, 3], 0, async () => {
    active += 1;
    maxActive = Math.max(maxActive, active);
    await new Promise((resolve) => setTimeout(resolve, 1));
    active -= 1;
  });

  assert.equal(maxActive, 1);
});
