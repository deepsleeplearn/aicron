export type ParsedAssistantCommand = {
  displayText: string;
  prompt: string;
  webSearch: boolean;
};

const WEB_SEARCH_COMMAND = "/web-search";
const DEFAULT_WEB_SEARCH_PROMPT = "联网搜索当前文章相关资料，结合原文和历史对话回答。";

export function parseAssistantCommand(input: string): ParsedAssistantCommand {
  const displayText = input.trim();
  const lower = displayText.toLowerCase();
  if (lower === WEB_SEARCH_COMMAND || lower.startsWith(`${WEB_SEARCH_COMMAND} `)) {
    const prompt = displayText.slice(WEB_SEARCH_COMMAND.length).trim() || DEFAULT_WEB_SEARCH_PROMPT;
    return { displayText, prompt, webSearch: true };
  }

  return { displayText, prompt: displayText, webSearch: false };
}
