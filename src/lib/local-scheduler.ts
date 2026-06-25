import { DEFAULT_FETCH_INTERVAL_MINUTES, msUntilNextFetchSlot } from "./brief-window";
import { refreshAllSourcesWithBaseline } from "./refresh-runner";

const GLOBAL_KEY = "__aiMorningBriefSchedulerStarted";

type SchedulerGlobal = typeof globalThis & {
  [GLOBAL_KEY]?: boolean;
};

export function ensureLocalSchedulerStarted() {
  if (process.env.BRIEF_DISABLE_EMBEDDED_SCHEDULER === "1") return;
  const globalState = globalThis as SchedulerGlobal;
  if (globalState[GLOBAL_KEY]) return;
  globalState[GLOBAL_KEY] = true;

  const intervalMinutes = Number(
    process.env.BRIEF_FETCH_INTERVAL_MINUTES ?? DEFAULT_FETCH_INTERVAL_MINUTES
  );
  const baselineHour = Number(process.env.BRIEF_FETCH_HOUR ?? 7);
  const baselineMinute = Number(process.env.BRIEF_FETCH_MINUTE ?? 0);

  const runRefresh = async () => {
    try {
      await refreshAllSourcesWithBaseline({ baselineHour, baselineMinute });
    } catch (error) {
      console.error("[ai-morning-brief] scheduled refresh failed", error);
    }
  };

  const schedule = () => {
    const timer = setTimeout(async () => {
      await runRefresh();
      schedule();
    }, msUntilNextFetchSlot(new Date(), intervalMinutes));
    timer.unref?.();
  };

  void runRefresh();
  schedule();
}
