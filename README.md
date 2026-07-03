<div align="center">

# AICron

**Local-first AI information radar**

Scheduled briefing workspace for AI labs, research papers, expert X feeds, GitHub trends, CodexRadar, and local Codex reading.

`30 min sync` · `local only` · `Codex assistant` · `source adapters` · `tool radar`

</div>

AI Information Cron: a local-first technical briefing workspace for AI labs, Codex, Claude Code, research papers, expert X feeds, GitHub trends, and tool radar updates.

## Product Requirements

Current product requirements and source rules are maintained in [`docs/PROJECT_REQUIREMENTS.md`](docs/PROJECT_REQUIREMENTS.md).

When navigation, sources, fetching, presentation, scheduling, or article interaction behavior changes, update that document in the same change.

## Run Locally

```bash
npm install
npm run fetch
npm run dev
```

Open the local URL printed by Next.js.

## Optional Environment

```bash
BRIEF_FETCH_HOUR=7
BRIEF_FETCH_MINUTE=0
```

Article discussion is handled by the local `codex` CLI through the server route in read-only mode. The browser never calls a model provider directly.

## Scheduled Fetching

For a long-running local scheduler:

```bash
npm run scheduler
```

For macOS `launchd`, call `npm run fetch` once per morning from this project directory.

## Source Extension

Default sources live in `src/lib/sources.ts`. Add new feeds by inserting a `Source` entry:

- `rss`: RSS or Atom feeds.
- `html-list`: web pages without RSS; configure `includePathPrefixes`.
- `markdown-changelog`: raw Markdown changelog files.

New source adapters should implement the same normalized `RawItem` shape and then use the existing fetch pipeline.
