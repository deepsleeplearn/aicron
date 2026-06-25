export const DASHBOARD_AUTO_SYNC_INTERVAL_MS = 60_000;

export function shouldAutoSyncDashboardItems(input: {
  hasSelectedItem: boolean;
  visibilityState: DocumentVisibilityState | "visible" | "hidden" | "prerender";
}): boolean {
  return !input.hasSelectedItem && input.visibilityState === "visible";
}
