import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { parseAssistantCommand } from "../src/lib/assistant-commands";

const dashboardSource = readFileSync("src/components/dashboard.tsx", "utf8");
const codexRouteSource = readFileSync("src/app/api/codex/route.ts", "utf8");
const codexWorkerSource = readFileSync("src/lib/codex-worker.ts", "utf8");

test("assistant slash command parses web search prompts without changing normal prompts", () => {
  assert.deepEqual(parseAssistantCommand("解释一下摘要"), {
    displayText: "解释一下摘要",
    prompt: "解释一下摘要",
    webSearch: false
  });

  assert.deepEqual(parseAssistantCommand("/web-search 打开原网址阅读原论文，然后回答问题"), {
    displayText: "/web-search 打开原网址阅读原论文，然后回答问题",
    prompt: "打开原网址阅读原论文，然后回答问题",
    webSearch: true
  });
});

test("right assistant panel exposes slash web-search command and submits webSearch flag with history", () => {
  assert.match(dashboardSource, /const SLASH_COMMANDS/);
  assert.match(dashboardSource, /showSlashCommandMenu/);
  assert.match(dashboardSource, /\/web-search /);
  assert.match(dashboardSource, /const command = parseAssistantCommand\(question\)/);
  assert.match(dashboardSource, /webSearch: command\.webSearch/);
  assert.match(dashboardSource, /history: messages/);
});

test("right assistant panel uses textarea input while preserving command send behavior", () => {
  assert.match(dashboardSource, /<textarea/);
  assert.match(dashboardSource, /placeholder="输入 @ 选择快捷问题，输入 \/ 选择联网搜索，或直接追问"/);
  assert.match(dashboardSource, /event\.key === "Enter" && !event\.shiftKey && !isAssistantInputCommandOnly/);
  assert.match(dashboardSource, /event\.preventDefault\(\)/);
  assert.doesNotMatch(dashboardSource, /<input\s*\n\s*value=\{assistantInput\}/);
});

test("codex API accepts webSearch and worker keeps model and effort from existing config", () => {
  assert.match(codexRouteSource, /webSearch:\s*z\.boolean\(\)\.optional\(\)/);
  assert.match(codexWorkerSource, /webSearch\?: boolean/);
  assert.match(codexWorkerSource, /collectWebSearchContext/);
  assert.match(codexWorkerSource, /联网检索材料/);
  assert.match(codexWorkerSource, /"exec", "--sandbox", "read-only", "--skip-git-repo-check", "-"/);
  assert.doesNotMatch(codexWorkerSource, /--model/);
  assert.doesNotMatch(codexWorkerSource, /model_reasoning_effort/);
});
