import { existsSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

import { briefWindowStart } from "./brief-window";
import { itemSortTimestamp } from "./date-format";
import { applyBriefDisplayPolicy } from "./display-policy";
import { canonicalizeUrl } from "./normalization";
import { DEFAULT_SOURCES, REMOVED_SOURCE_IDS } from "./sources";
import type { AssistantMessage, Source, StoredItem } from "./types";

const require = createRequire(import.meta.url);

type Database = {
  exec(sql: string): void;
  prepare(sql: string): {
    all(...params: unknown[]): Record<string, unknown>[];
    get(...params: unknown[]): Record<string, unknown> | undefined;
    run(...params: unknown[]): { changes: number; lastInsertRowid: number | bigint };
  };
};

let singleton: Database | null = null;

export function getDb(): Database {
  if (singleton) return singleton;
  const dataDir = path.join(process.cwd(), "data");
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
  const { DatabaseSync } = require("node:sqlite") as { DatabaseSync: new (name: string) => Database };
  singleton = new DatabaseSync(path.join(dataDir, "morning-brief.db"));
  ensureSchema(singleton);
  seedSources(singleton);
  return singleton;
}

function ensureSchema(db: Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sources (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      vendor TEXT NOT NULL,
      category TEXT NOT NULL,
      type TEXT NOT NULL,
      url TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      config_json TEXT NOT NULL DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      source_id TEXT NOT NULL,
      source_name TEXT NOT NULL,
      vendor TEXT NOT NULL,
      source_category TEXT NOT NULL,
      title TEXT NOT NULL,
      canonical_url TEXT NOT NULL,
      published_at TEXT,
      submitted_at TEXT,
      excerpt TEXT,
      importance INTEGER NOT NULL DEFAULT 1,
      tags_json TEXT NOT NULL DEFAULT '[]',
      source_order INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(source_id, canonical_url)
    );

    CREATE TABLE IF NOT EXISTS item_content (
      item_id TEXT PRIMARY KEY,
      content TEXT,
      fetched_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(item_id) REFERENCES items(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS summaries (
      item_id TEXT PRIMARY KEY,
      summary TEXT NOT NULL,
      why_it_matters TEXT NOT NULL,
      action TEXT NOT NULL,
      generated_by TEXT NOT NULL,
      generated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(item_id) REFERENCES items(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS read_state (
      item_id TEXT PRIMARY KEY,
      read_at TEXT,
      starred INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY(item_id) REFERENCES items(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS assistant_threads (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      mode TEXT NOT NULL,
      messages_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(item_id) REFERENCES items(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS article_assistant_threads (
      id TEXT PRIMARY KEY,
      source_id TEXT NOT NULL,
      canonical_url TEXT NOT NULL,
      mode TEXT NOT NULL,
      messages_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(source_id, canonical_url, mode)
    );

    CREATE TABLE IF NOT EXISTS fetch_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_id TEXT NOT NULL,
      status TEXT NOT NULL,
      fetched_count INTEGER NOT NULL,
      duration_ms INTEGER NOT NULL,
      message TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS app_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  ensureColumn(db, "items", "source_order", "INTEGER");
  ensureColumn(db, "items", "submitted_at", "TEXT");
  migrateAssistantThreadsToArticleKeys(db);
}

function ensureColumn(db: Database, tableName: string, columnName: string, definition: string) {
  const rows = db.prepare(`PRAGMA table_info(${tableName})`).all();
  if (rows.some((row) => String(row.name) === columnName)) return;
  db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
}

function seedSources(db: Database) {
  const statement = db.prepare(`
    INSERT INTO sources (id, name, vendor, category, type, url, enabled, config_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      vendor = excluded.vendor,
      category = excluded.category,
      type = excluded.type,
      url = excluded.url,
      enabled = excluded.enabled,
      config_json = excluded.config_json
  `);

  for (const source of DEFAULT_SOURCES) {
    statement.run(
      source.id,
      source.name,
      source.vendor,
      source.category,
      source.type,
      source.url,
      source.enabled ? 1 : 0,
      JSON.stringify({
        includePathPrefixes: source.includePathPrefixes ?? [],
        includeHostnames: source.includeHostnames ?? [],
        includeCategories: source.includeCategories ?? [],
        excludeCategories: source.excludeCategories ?? [],
        includeTextPatterns: source.includeTextPatterns ?? [],
        excludeTextPatterns: source.excludeTextPatterns ?? [],
        maxItems: source.maxItems
      })
    );
  }

  for (const sourceId of REMOVED_SOURCE_IDS) {
    db.prepare("UPDATE sources SET enabled = 0 WHERE id = ?").run(sourceId);
  }
}

export function listSources(): Source[] {
  const rows = getDb().prepare("SELECT * FROM sources ORDER BY vendor, name").all();
  return rows
    .filter((row) => !REMOVED_SOURCE_IDS.has(String(row.id)))
    .map((row) => {
      const config = JSON.parse(String(row.config_json ?? "{}")) as Partial<Source>;
      return {
        id: String(row.id),
        name: String(row.name),
        vendor: String(row.vendor),
        category: row.category as Source["category"],
        type: row.type as Source["type"],
        url: String(row.url),
        enabled: Number(row.enabled) === 1,
        includePathPrefixes: config.includePathPrefixes,
        includeHostnames: config.includeHostnames,
        includeCategories: config.includeCategories,
        excludeCategories: config.excludeCategories,
        includeTextPatterns: config.includeTextPatterns,
        excludeTextPatterns: config.excludeTextPatterns,
        maxItems: config.maxItems
      };
    });
}

export function recordFetchRun(input: {
  sourceId: string;
  status: "ok" | "error";
  fetchedCount: number;
  durationMs: number;
  message?: string;
}) {
  getDb()
    .prepare(
      "INSERT INTO fetch_runs (source_id, status, fetched_count, duration_ms, message) VALUES (?, ?, ?, ?, ?)"
    )
    .run(input.sourceId, input.status, input.fetchedCount, input.durationMs, input.message ?? null);
}

export function getBriefBaselineAt(): string {
  return getAppState("brief_baseline_at") ?? briefWindowStart().toISOString();
}

export function getSavedBriefBaselineAt(): string | null {
  return getAppState("brief_baseline_at");
}

export function setBriefBaselineAt(value: string = new Date().toISOString()) {
  setAppState("brief_baseline_at", value);
}

function getAppState(key: string): string | null {
  const row = getDb().prepare("SELECT value FROM app_state WHERE key = ?").get(key);
  return row?.value ? String(row.value) : null;
}

function setAppState(key: string, value: string) {
  getDb()
    .prepare(
      `
      INSERT INTO app_state (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `
    )
    .run(key, value);
}

export function upsertItem(input: {
  id: string;
  source: Source;
  title: string;
  canonicalUrl: string;
  publishedAt?: string | null;
  submittedAt?: string | null;
  excerpt?: string | null;
  content?: string | null;
  sourceOrder?: number | null;
  importance: number;
  tags: string[];
  summary: string;
  whyItMatters: string;
  action: string;
}) {
  const db = getDb();
  const existing = db
    .prepare("SELECT id FROM items WHERE source_id = ? AND canonical_url = ?")
    .get(input.source.id, input.canonicalUrl);
  const itemId = existing?.id ? String(existing.id) : input.id;

  db.prepare(
    `
      INSERT INTO items (
        id, source_id, source_name, vendor, source_category, title, canonical_url,
        published_at, submitted_at, excerpt, importance, tags_json, source_order
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        published_at = COALESCE(excluded.published_at, items.published_at),
        submitted_at = COALESCE(excluded.submitted_at, items.submitted_at),
        excerpt = COALESCE(excluded.excerpt, items.excerpt),
        importance = excluded.importance,
        tags_json = excluded.tags_json,
        source_order = excluded.source_order,
        updated_at = CURRENT_TIMESTAMP
    `
  ).run(
    itemId,
    input.source.id,
    input.source.name,
    input.source.vendor,
    input.source.category,
    input.title,
    input.canonicalUrl,
    input.publishedAt ?? null,
    input.submittedAt ?? null,
    input.excerpt ?? null,
    input.importance,
    JSON.stringify(input.tags),
    input.sourceOrder ?? null
  );

  db.prepare(
    `
      INSERT INTO item_content (item_id, content)
      VALUES (?, ?)
      ON CONFLICT(item_id) DO UPDATE SET
        content = CASE
          WHEN excluded.content IS NULL THEN item_content.content
          WHEN item_content.content IS NULL THEN excluded.content
          WHEN length(excluded.content) > length(item_content.content) THEN excluded.content
          ELSE item_content.content
        END,
        fetched_at = CURRENT_TIMESTAMP
    `
  ).run(itemId, input.content ?? null);

  db.prepare(
    `
      INSERT INTO summaries (item_id, summary, why_it_matters, action, generated_by)
      VALUES (?, ?, ?, ?, 'heuristic')
      ON CONFLICT(item_id) DO UPDATE SET
        summary = excluded.summary,
        why_it_matters = excluded.why_it_matters,
        action = excluded.action,
        generated_by = excluded.generated_by,
        generated_at = CURRENT_TIMESTAMP
    `
  ).run(itemId, input.summary, input.whyItMatters, input.action);
}

export function removeSourceItemsExcept(sourceId: string, canonicalUrls: string[]) {
  const db = getDb();
  if (canonicalUrls.length === 0) return;
  const placeholders = canonicalUrls.map(() => "?").join(", ");
  const params = [sourceId, ...canonicalUrls];
  const staleRows = db
    .prepare(`SELECT id FROM items WHERE source_id = ? AND canonical_url NOT IN (${placeholders})`)
    .all(...params)
    .map((row) => String(row.id));
  if (staleRows.length === 0) return;

  const idPlaceholders = staleRows.map(() => "?").join(", ");
  db.prepare(`DELETE FROM summaries WHERE item_id IN (${idPlaceholders})`).run(...staleRows);
  db.prepare(`DELETE FROM read_state WHERE item_id IN (${idPlaceholders})`).run(...staleRows);
  db.prepare(`DELETE FROM item_content WHERE item_id IN (${idPlaceholders})`).run(...staleRows);
  db.prepare(`DELETE FROM items WHERE id IN (${idPlaceholders})`).run(...staleRows);
}

export function listItems(
  input: {
    q?: string;
    tag?: string;
    unreadOnly?: boolean;
    vendor?: string;
    sourceIds?: string[];
    sort?: "ranked" | "latest";
  } = {}
): StoredItem[] {
  const q = input.q?.trim().toLowerCase();
  const sourceWhere =
    input.sourceIds?.length
      ? `WHERE i.source_id IN (${input.sourceIds.map(() => "?").join(", ")})`
      : "";
  const queryParams = input.sourceIds ?? [];
  const rows = getDb()
    .prepare(
      `
      SELECT
        i.*, c.content, s.summary, s.why_it_matters, s.action,
        r.read_at, COALESCE(r.starred, 0) AS starred
      FROM items i
      LEFT JOIN item_content c ON c.item_id = i.id
      LEFT JOIN summaries s ON s.item_id = i.id
      LEFT JOIN read_state r ON r.item_id = i.id
      ${sourceWhere}
      ORDER BY
        i.importance DESC,
        COALESCE(i.submitted_at, i.published_at, i.created_at) DESC
      LIMIT 500
    `
    )
    .all(...queryParams);

  const briefBaselineAt = getBriefBaselineAt();
  return rows
    .map((row) => rowToStoredItem(row, briefBaselineAt))
    .filter((item) => {
      if (REMOVED_SOURCE_IDS.has(item.sourceId)) return false;
      if (input.unreadOnly && item.readAt) return false;
      if (input.vendor && item.vendor !== input.vendor) return false;
      if (input.sourceIds?.length && !input.sourceIds.includes(item.sourceId)) return false;
      if (input.tag && input.tag !== "all" && !item.tags.includes(input.tag)) return false;
      if (!q) return true;
      return [item.title, item.summary, item.sourceName, item.vendor, item.tags.join(" ")]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    })
    .sort(input.sort === "latest" ? compareLatestItems : compareBriefItems);
}

export function listBriefItems(
  input: {
    q?: string;
    tag?: string;
    unreadOnly?: boolean;
    vendor?: string;
    sourceIds?: string[];
    sort?: "ranked" | "latest";
  } = {}
): StoredItem[] {
  return applyBriefDisplayPolicy(listItems(input));
}

export function searchItemsByTitle(input: { q?: string } = {}): StoredItem[] {
  const rawQuery = input.q?.trim() ?? "";
  const q = rawQuery.toLowerCase();
  if (!q) return [];

  const rows = getDb()
    .prepare(
      `
      SELECT
        i.*, c.content, s.summary, s.why_it_matters, s.action,
        r.read_at, COALESCE(r.starred, 0) AS starred
      FROM items i
      LEFT JOIN item_content c ON c.item_id = i.id
      LEFT JOIN summaries s ON s.item_id = i.id
      LEFT JOIN read_state r ON r.item_id = i.id
      ORDER BY COALESCE(i.submitted_at, i.published_at, i.created_at) DESC
    `
    )
    .all();

  const briefBaselineAt = getBriefBaselineAt();
  return rows
    .map((row) => rowToStoredItem(row, briefBaselineAt))
    .filter((item) => !REMOVED_SOURCE_IDS.has(item.sourceId) && item.title.toLowerCase().includes(q))
    .sort((a, b) => compareTitleSearchItems(a, b, rawQuery));
}

export function getItem(id: string): StoredItem | null {
  const row = getDb()
    .prepare(
      `
      SELECT
        i.*, c.content, s.summary, s.why_it_matters, s.action,
        r.read_at, COALESCE(r.starred, 0) AS starred
      FROM items i
      LEFT JOIN item_content c ON c.item_id = i.id
      LEFT JOIN summaries s ON s.item_id = i.id
      LEFT JOIN read_state r ON r.item_id = i.id
      WHERE i.id = ?
    `
    )
    .get(id);
  return row ? rowToStoredItem(row, getBriefBaselineAt()) : null;
}

export function updateItemContent(itemId: string, content: string) {
  getDb()
    .prepare(
      `
      INSERT INTO item_content (item_id, content)
      VALUES (?, ?)
      ON CONFLICT(item_id) DO UPDATE SET content = excluded.content, fetched_at = CURRENT_TIMESTAMP
    `
    )
    .run(itemId, content);
}

export function setReadState(input: { itemId: string; read?: boolean; starred?: boolean }) {
  const current = getDb()
    .prepare("SELECT read_at, starred FROM read_state WHERE item_id = ?")
    .get(input.itemId);
  const readAt =
    input.read === undefined
      ? (current?.read_at ?? null)
      : input.read
        ? new Date().toISOString()
        : null;
  const starred =
    input.starred === undefined ? Number(current?.starred ?? 0) : input.starred ? 1 : 0;

  getDb()
    .prepare(
      `
      INSERT INTO read_state (item_id, read_at, starred)
      VALUES (?, ?, ?)
      ON CONFLICT(item_id) DO UPDATE SET read_at = excluded.read_at, starred = excluded.starred
    `
    )
    .run(input.itemId, readAt, starred);
}

export function appendAssistantExchange(input: {
  itemId: string;
  mode: "reading" | "codex";
  userMessage: string;
  assistantMessage: string;
}) {
  const db = getDb();
  const articleKey = getArticleThreadKey(db, input.itemId, input.mode);
  if (!articleKey) return;
  const current = db
    .prepare(
      `
      SELECT messages_json FROM article_assistant_threads
      WHERE source_id = ? AND canonical_url = ? AND mode = ?
    `
    )
    .get(articleKey.sourceId, articleKey.canonicalUrl, input.mode);
  const messages = current?.messages_json
    ? (JSON.parse(String(current.messages_json)) as AssistantMessage[])
    : [];
  messages.push(
    { role: "user", content: input.userMessage },
    { role: "assistant", content: input.assistantMessage }
  );
  db
    .prepare(
      `
      INSERT INTO article_assistant_threads (id, source_id, canonical_url, mode, messages_json)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET messages_json = excluded.messages_json, updated_at = CURRENT_TIMESTAMP
    `
    )
    .run(
      articleKey.id,
      articleKey.sourceId,
      articleKey.canonicalUrl,
      input.mode,
      JSON.stringify(messages)
    );
}

export function getAssistantMessages(input: {
  itemId: string;
  mode: "reading" | "codex";
}): AssistantMessage[] {
  const db = getDb();
  const articleKey = getArticleThreadKey(db, input.itemId, input.mode);
  if (!articleKey) return [];
  const current = db
    .prepare(
      `
      SELECT messages_json FROM article_assistant_threads
      WHERE source_id = ? AND canonical_url = ? AND mode = ?
    `
    )
    .get(articleKey.sourceId, articleKey.canonicalUrl, input.mode);
  return current?.messages_json ? (JSON.parse(String(current.messages_json)) as AssistantMessage[]) : [];
}

export function getRecentFetchRuns() {
  return getDb()
    .prepare(
      `
      SELECT * FROM fetch_runs
      WHERE id IN (SELECT MAX(id) FROM fetch_runs GROUP BY source_id)
      ORDER BY created_at DESC
    `
    )
    .all();
}

function rowToStoredItem(row: Record<string, unknown>, briefBaselineAt: string): StoredItem {
  const createdAt = String(row.created_at);
  return {
    id: String(row.id),
    sourceId: String(row.source_id),
    sourceName: String(row.source_name),
    vendor: String(row.vendor),
    sourceCategory: row.source_category as StoredItem["sourceCategory"],
    title: String(row.title),
    canonicalUrl: String(row.canonical_url),
    publishedAt: row.published_at ? String(row.published_at) : null,
    submittedAt: row.submitted_at ? String(row.submitted_at) : null,
    excerpt: row.excerpt ? String(row.excerpt) : null,
    content: row.content ? String(row.content) : null,
    summary: row.summary ? String(row.summary) : null,
    whyItMatters: row.why_it_matters ? String(row.why_it_matters) : null,
    action: row.action ? String(row.action) : null,
    tags: JSON.parse(String(row.tags_json ?? "[]")) as string[],
    importance: Number(row.importance ?? 1),
    readAt: row.read_at ? String(row.read_at) : null,
    starred: Number(row.starred ?? 0) === 1,
    isNewSinceBrief: isAfterBaseline(createdAt, briefBaselineAt),
    sourceOrder: row.source_order === null || row.source_order === undefined ? null : Number(row.source_order),
    createdAt
  };
}

function isAfterBaseline(createdAt: string, baselineAt: string): boolean {
  const created = Date.parse(createdAt);
  const baseline = Date.parse(baselineAt);
  return !Number.isNaN(created) && !Number.isNaN(baseline) && created > baseline;
}

function compareBriefItems(a: StoredItem, b: StoredItem): number {
  if (b.importance !== a.importance) return b.importance - a.importance;
  return itemTimestamp(b) - itemTimestamp(a);
}

function compareLatestItems(a: StoredItem, b: StoredItem): number {
  return itemTimestamp(b) - itemTimestamp(a);
}

function compareTitleSearchItems(a: StoredItem, b: StoredItem, query: string): number {
  const aRank = titleSearchRank(a.title, query);
  const bRank = titleSearchRank(b.title, query);
  for (let index = 0; index < Math.max(aRank.caseMatches.length, bRank.caseMatches.length); index += 1) {
    const caseDelta = (bRank.caseMatches[index] ?? 0) - (aRank.caseMatches[index] ?? 0);
    if (caseDelta !== 0) return caseDelta;
  }
  if (aRank.index !== bRank.index) return aRank.index - bRank.index;
  return compareLatestItems(a, b);
}

function titleSearchRank(title: string, query: string): { caseMatches: number[]; index: number } {
  const lowerTitle = title.toLowerCase();
  const lowerQuery = query.toLowerCase();
  let bestCaseMatches: number[] = [];
  let bestIndex = Number.MAX_SAFE_INTEGER;

  for (let index = lowerTitle.indexOf(lowerQuery); index !== -1; index = lowerTitle.indexOf(lowerQuery, index + 1)) {
    const caseMatches = Array.from(query, (character, offset) => (title[index + offset] === character ? 1 : 0));
    if (isBetterTitleSearchMatch(caseMatches, index, bestCaseMatches, bestIndex)) {
      bestCaseMatches = caseMatches;
      bestIndex = index;
    }
  }

  return { caseMatches: bestCaseMatches, index: bestIndex };
}

function isBetterTitleSearchMatch(candidate: number[], candidateIndex: number, current: number[], currentIndex: number) {
  if (current.length === 0) return true;
  for (let index = 0; index < Math.max(candidate.length, current.length); index += 1) {
    const delta = (candidate[index] ?? 0) - (current[index] ?? 0);
    if (delta !== 0) return delta > 0;
  }
  return candidateIndex < currentIndex;
}

function itemTimestamp(item: StoredItem): number {
  return itemSortTimestamp(item);
}

function migrateAssistantThreadsToArticleKeys(db: Database) {
  db.prepare(
    `
    INSERT OR IGNORE INTO article_assistant_threads (
      id, source_id, canonical_url, mode, messages_json, created_at, updated_at
    )
    SELECT
      at.mode || ':' || i.source_id || ':' || i.canonical_url,
      i.source_id,
      i.canonical_url,
      at.mode,
      at.messages_json,
      at.created_at,
      at.updated_at
    FROM assistant_threads at
    INNER JOIN items i ON i.id = at.item_id
  `
  ).run();
}

function getArticleThreadKey(db: Database, itemId: string, mode: "reading" | "codex") {
  const row = db.prepare("SELECT source_id, canonical_url FROM items WHERE id = ?").get(itemId);
  if (!row?.source_id || !row?.canonical_url) return null;
  const sourceId = String(row.source_id);
  const canonicalUrl = canonicalizeUrl(String(row.canonical_url));
  return {
    id: `${mode}:${sourceId}:${canonicalUrl}`,
    sourceId,
    canonicalUrl
  };
}
