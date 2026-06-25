export const DEFAULT_BASELINE_HOUR = 7;
export const DEFAULT_FETCH_INTERVAL_MINUTES = 30;

export function briefWindowStart(
  now = new Date(),
  baselineHour = DEFAULT_BASELINE_HOUR,
  baselineMinute = 0
): Date {
  const start = new Date(now);
  start.setHours(baselineHour, baselineMinute, 0, 0);
  if (now < start) start.setDate(start.getDate() - 1);
  return start;
}

export function isBaselineDue(input: {
  now?: Date;
  lastBaselineAt?: string | null;
  baselineHour?: number;
  baselineMinute?: number;
} = {}): boolean {
  const now = input.now ?? new Date();
  const start = briefWindowStart(now, input.baselineHour, input.baselineMinute);
  if (now < start) return false;
  if (!input.lastBaselineAt) return true;

  const last = Date.parse(input.lastBaselineAt);
  return Number.isNaN(last) || last < start.getTime();
}

export function msUntilNextFetchSlot(
  now = new Date(),
  intervalMinutes = DEFAULT_FETCH_INTERVAL_MINUTES
): number {
  const intervalMs = intervalMinutes * 60 * 1000;
  const next = Math.ceil((now.getTime() + 1) / intervalMs) * intervalMs;
  return next - now.getTime();
}
