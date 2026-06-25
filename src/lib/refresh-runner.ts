import { DEFAULT_BASELINE_HOUR, isBaselineDue } from "./brief-window";
import {
  getBriefBaselineAt,
  getSavedBriefBaselineAt,
  listSources,
  setBriefBaselineAt
} from "./db";
import { refreshSources } from "./fetcher";
import type { FetchHealth } from "./types";

export type RefreshRunResult = {
  results: FetchHealth[];
  baselineRun: boolean;
  baselineAt: string;
};

export async function refreshAllSourcesWithBaseline(input: {
  now?: Date;
  baselineHour?: number;
  baselineMinute?: number;
  forceBaseline?: boolean;
} = {}): Promise<RefreshRunResult> {
  const baselineRun =
    input.forceBaseline ||
    isBaselineDue({
      now: input.now,
      lastBaselineAt: getSavedBriefBaselineAt(),
      baselineHour: input.baselineHour ?? DEFAULT_BASELINE_HOUR,
      baselineMinute: input.baselineMinute ?? 0
    });

  const results = await refreshSources(listSources());
  if (baselineRun) {
    setBriefBaselineAt((input.now ?? new Date()).toISOString());
  }

  return {
    results,
    baselineRun,
    baselineAt: getBriefBaselineAt()
  };
}
