import { spawn } from "node:child_process";
const DEFAULT_MESSAGE = "Codex任务完成";
const dryRun = process.argv.includes("--dry-run");
const speakNow = process.argv.includes("--speak-now");
const message = process.env.CODEX_DONE_MESSAGE || DEFAULT_MESSAGE;
const delayMs = parseDelay(process.env.CODEX_DONE_NOTIFY_DELAY_MS, 3000);
const sayBin = "/usr/bin/say";

if (dryRun) {
  console.log(message);
  process.exit(0);
}

if (process.platform !== "darwin") {
  console.log(message);
  process.exit(0);
}

if (speakNow) {
  const speaker = spawn(sayBin, [message], { stdio: "ignore" });

  speaker.on("error", () => {
    process.exit(0);
  });

  speaker.on("close", () => {
    process.exit(0);
  });
} else {
  const child = spawn("/bin/sh", ["-c", 'sleep "$1"; "$2" "$3"', "codex-notify", String(delayMs / 1000), sayBin, message], {
    detached: true,
    stdio: "ignore"
  });
  child.unref();
  process.exit(0);
}

function parseDelay(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}
