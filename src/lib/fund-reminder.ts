const SHANGHAI_UTC_OFFSET_MS = 8 * 60 * 60 * 1000;
const REMINDER_START_MINUTE = 14 * 60 + 45;
const REMINDER_END_MINUTE = 15 * 60;

export function isFundReminderActive(now = new Date()): boolean {
  const shanghaiDate = new Date(now.getTime() + SHANGHAI_UTC_OFFSET_MS);
  const day = shanghaiDate.getUTCDay();
  if (day === 0 || day === 6) return false;

  const minuteOfDay = shanghaiDate.getUTCHours() * 60 + shanghaiDate.getUTCMinutes();
  return minuteOfDay >= REMINDER_START_MINUTE && minuteOfDay < REMINDER_END_MINUTE;
}
