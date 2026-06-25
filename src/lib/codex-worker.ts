import { spawn } from "node:child_process";

import { fetchArticleContent, shouldRefreshArticleContent, shouldUpgradePlainArticleContent } from "./content";
import { getItem, updateItemContent } from "./db";
import { richContentToText } from "./rich-content";
import type { AssistantMessage } from "./types";
import { collectWebSearchContext } from "./web-search";

const DEFAULT_CODEX_PROMPTS: Record<string, string> = {
  explain: "用中文解释这篇文章的核心内容，面向算法工程师，分清事实、影响和不确定性。",
  impact: "提取这篇文章对算法工程师、后端工程师、AI 产品研发的实际影响。",
  migration: "判断这篇文章是否意味着我需要迁移代码、调整 API 使用或关注版本变化。",
  actions: "把这篇文章转成可执行行动项，按今天、这周、可忽略分组。",
  core: "用中文帮忙总结提炼一下本文的核心内容；",
  outline: "用中文帮忙梳理介绍一下这篇文章的内容；",
  translate: "将这篇英文文章翻译为中文，注意专业术语的翻译需贴合文章领域与表达；",
  takeaways:
    "用中文帮忙整理一下这篇文档对于我这样的AI从业者(程序员)，有什么启发，有什么值得学习的地方，向我清晰罗列并说明理由；"
};

export async function runCodexReadOnly(input: {
  itemId: string;
  prompt: string;
  history?: AssistantMessage[];
  repoPath?: string;
  webSearch?: boolean;
}): Promise<{ output: string }> {
  const item = getItem(input.itemId);
  if (!item) throw new Error("Item not found");
  const resolvedPrompt = DEFAULT_CODEX_PROMPTS[input.prompt] ?? input.prompt;

  let content = item.sourceId === "vector-publications" ? null : item.content;
  if (item.sourceId !== "vector-publications" && (shouldRefreshArticleContent(item) || shouldUpgradePlainArticleContent(item))) {
    const fetched = await fetchArticleContent(item.canonicalUrl).catch(() => null);
    if (fetched) {
      updateItemContent(item.id, fetched);
      content = fetched;
    }
  }

  const previous = (input.history ?? [])
    .slice(-8)
    .map((message) => `${message.role === "user" ? "用户" : "Codex"}：${message.content}`)
    .join("\n");
  const webSearchContext = input.webSearch
    ? await collectWebSearchContext({ item, prompt: resolvedPrompt }).catch(() => null)
    : null;

  const fullPrompt = [
    "你是本地 Codex。用户正在阅读一篇 AI 技术文章，并希望直接与你围绕这篇文章讨论。",
    input.webSearch
      ? "默认只读分析，不要修改文件。请综合当前文章、历史对话、联网检索材料和用户问题回答；不确定时明确说明。"
      : "默认只读分析，不要修改文件。只能基于当前文章、已给出的上下文和用户问题回答；不确定时明确说明。",
    "回答用中文，面向算法工程师/程序员，重点给出技术理解、工程影响、迁移判断和可执行建议。",
    "",
    `文章标题：${item.title}`,
    `来源：${item.sourceName}`,
    `链接：${item.canonicalUrl}`,
    `摘要：${item.summary ?? ""}`,
    `正文：${richContentToText(content ?? item.excerpt ?? "").slice(0, 16000)}`,
    "",
    `联网检索材料：${webSearchContext ?? (input.webSearch ? "未检索到可用联网材料。" : "未启用")}`,
    "",
    `历史对话：${previous || "无"}`,
    "",
    `用户问题：${resolvedPrompt}`
  ].join("\n");

  return new Promise((resolve, reject) => {
    const args = ["exec", "--sandbox", "read-only", "--skip-git-repo-check", "-"];
    const child = spawn("codex", args, {
      cwd: input.repoPath || process.cwd(),
      stdio: ["pipe", "pipe", "pipe"],
      env: process.env
    });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", (error) => {
      reject(new Error(`Codex worker failed to start: ${error.message}`));
    });
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `Codex worker exited with code ${code}`));
        return;
      }
      resolve({ output: stdout.trim() });
    });
    child.stdin.write(fullPrompt);
    child.stdin.end();
  });
}
