import {
  DEFAULT_FETCH_INTERVAL_MINUTES,
  msUntilNextFetchSlot
} from "../src/lib/brief-window";
import { refreshAllSourcesWithBaseline } from "../src/lib/refresh-runner";

const HOUR = Number(process.env.BRIEF_FETCH_HOUR ?? 7);
const MINUTE = Number(process.env.BRIEF_FETCH_MINUTE ?? 0);
const INTERVAL_MINUTES = Number(process.env.BRIEF_FETCH_INTERVAL_MINUTES ?? DEFAULT_FETCH_INTERVAL_MINUTES);

async function runFetch(label: string) {
  console.log(`[${new Date().toISOString()}] ${label}`);
  const result = await refreshAllSourcesWithBaseline({
    baselineHour: HOUR,
    baselineMinute: MINUTE
  });
  console.log(JSON.stringify(result));
}

async function main() {
  await runFetch("initial fetch");
  const schedule = () => {
    const delay = msUntilNextFetchSlot(new Date(), INTERVAL_MINUTES);
    console.log(`Next fetch in ${Math.round(delay / 1000 / 60)} minutes.`);
    setTimeout(async () => {
      await runFetch("scheduled fetch");
      schedule();
    }, delay);
  };
  schedule();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
