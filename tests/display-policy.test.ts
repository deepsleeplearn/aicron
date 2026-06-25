import assert from "node:assert/strict";
import test from "node:test";

import {
  applyBriefDisplayPolicy,
  isHighSignalAgentChange,
  shouldShowOnBrief
} from "../src/lib/display-policy";
import type { StoredItem } from "../src/lib/types";

const baseItem: StoredItem = {
  id: "item-1",
  sourceId: "claude-code-changelog",
  sourceName: "Claude Code Changelog",
  vendor: "Anthropic",
  sourceCategory: "coding-agent",
  title: "Claude Code Changelog 1.2.3",
  canonicalUrl: "https://example.com/changelog#1.2.3",
  publishedAt: null,
  submittedAt: null,
  excerpt: null,
  content: null,
  summary: null,
  whyItMatters: null,
  action: null,
  tags: ["coding-agent"],
  importance: 3,
  readAt: null,
  starred: false,
  isNewSinceBrief: false,
  sourceOrder: null,
  createdAt: "2026-06-18T00:00:00.000Z"
};

test("routine Codex and Claude Code changelog entries stay out of the brief", () => {
  assert.equal(
    shouldShowOnBrief({
      ...baseItem,
      summary: "Fixed typos, updated README, and bumped dependencies.",
      importance: 3
    }),
    false
  );
});

test("agent changelog entries with engineering impact are shown", () => {
  assert.equal(
    shouldShowOnBrief({
      ...baseItem,
      sourceId: "openai-codex-releases",
      sourceName: "Codex Releases",
      vendor: "OpenAI",
      summary: "Breaking change: sandbox permissions and MCP tool configuration now require migration.",
      importance: 5,
      tags: ["coding-agent", "breaking-change"]
    }),
    true
  );
});

test("high signal agent judgment requires real change signals, not just source name", () => {
  assert.equal(
    isHighSignalAgentChange({
      title: "Claude Code Changelog 1.2.2",
      summary: "Previous release with small UI polish.",
      importance: 4
    }),
    false
  );
});

test("agent changelog sources are capped in the brief", () => {
  const items = Array.from({ length: 8 }, (_, index) => ({
    ...baseItem,
    id: `agent-${index}`,
    summary: "Breaking change: sandbox permissions and MCP configuration require migration.",
    importance: 5,
    tags: ["coding-agent", "breaking-change"]
  }));

  assert.equal(applyBriefDisplayPolicy(items).length, 4);
});

test("status feeds are deduped and capped in the brief", () => {
  const items = [
    ...Array.from({ length: 4 }, (_, index) => ({
      ...baseItem,
      id: `status-duplicate-${index}`,
      sourceId: "openai-status",
      sourceName: "OpenAI Status",
      sourceCategory: "status" as const,
      title: "Elevated API errors",
      summary: "Status: Investigating elevated API errors.",
      importance: 4,
      tags: ["status"]
    })),
    ...Array.from({ length: 4 }, (_, index) => ({
      ...baseItem,
      id: `status-unique-${index}`,
      sourceId: "openai-status",
      sourceName: "OpenAI Status",
      sourceCategory: "status" as const,
      title: `Status incident ${index}`,
      summary: "Status: Investigating an incident.",
      importance: 4,
      tags: ["status"]
    }))
  ];

  assert.deepEqual(
    applyBriefDisplayPolicy(items).map((item) => item.title),
    ["Elevated API errors", "Status incident 0", "Status incident 1"]
  );
});
