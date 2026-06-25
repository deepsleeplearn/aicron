import assert from "node:assert/strict";
import test from "node:test";

import {
  DASHBOARD_AUTO_SYNC_INTERVAL_MS,
  shouldAutoSyncDashboardItems
} from "../src/lib/dashboard-refresh";

test("dashboard auto sync runs only when the list or coverflow view is visible", () => {
  assert.equal(
    shouldAutoSyncDashboardItems({ hasSelectedItem: false, visibilityState: "visible" }),
    true
  );
  assert.equal(
    shouldAutoSyncDashboardItems({ hasSelectedItem: true, visibilityState: "visible" }),
    false
  );
  assert.equal(
    shouldAutoSyncDashboardItems({ hasSelectedItem: false, visibilityState: "hidden" }),
    false
  );
});

test("dashboard auto sync interval is frequent enough to pick up scheduled refreshes", () => {
  assert.equal(DASHBOARD_AUTO_SYNC_INTERVAL_MS, 60_000);
});
