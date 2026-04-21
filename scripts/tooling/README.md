# scripts/tooling

Developer tooling usage collection — writes events to a local SQLite database so tool adoption can be understood without automatic or silent data sharing.

## How it works

Every tool that participates writes a `start` event when it begins and an `end` event when it finishes. Events land in a local SQLite file on the developer's machine. Nothing is sent anywhere automatically. A separate `yarn tooling:report` command (Phase 3) lets developers review their history and choose what to share.

## Database location

| Scenario | Path |
|---|---|
| Default | `~/.tool-usage-collection/events.db` |
| Custom | Set `TOOL_USAGE_COLLECTION_DB_PATH` to any absolute path |

To redirect the database — for example to keep per-project histories separate, or to point multiple machines at the same location — set `TOOL_USAGE_COLLECTION_DB_PATH` in your shell profile:

```bash
# ~/.zshrc or ~/.bashrc
# Use $HOME (not ~) — double quotes suppress tilde expansion but not $HOME
export TOOL_USAGE_COLLECTION_DB_PATH="$HOME/.tool-usage-collection/events.db"
```

This applies to all projects on the machine. The directory is created automatically if it does not exist.

## Files

| File | Purpose |
|---|---|
| `db.ts` | Opens / creates the SQLite database and initialises the schema |
| `events.ts` | `trackEvent()` — shared write function used by all collection paths |
| `tool-usage-collection.ts` | Thin CLI wrapper invoked by yarn hooks and agent skill hooks |

## CLI usage

The CLI is invoked internally by hooks. You can also call it directly for debugging:

```bash
yarn tsx scripts/tooling/tool-usage-collection.ts \
  --tool my-tool \
  --type skill \
  --event start \
  [--session <uuid>] \
  [--agent cursor|claude|codex] \
  [--success true|false] \
  [--duration <ms>] \
  [--verbose]
```

`--tool`, `--type`, and `--event` are required. All other flags are optional.

## Collection paths

Three automated paths feed events into the shared database:

**Yarn Berry plugin** — `.yarn/plugins/plugin-usage-tracking.cjs` hooks into `wrapScriptExecution` and fires `start`, `end`, and `interrupted` events for every `yarn <script>` run. Zero changes to `package.json` scripts are needed.

**Claude Code skills** — a `PreToolUse` frontmatter hook (`once: true`, `async: true`) fires automatically on the first tool call after a skill is loaded. Zero tokens consumed.

**Cursor skills** — `.cursor/hooks.json` defines a `beforeReadFile` hook that fires when Cursor reads any `SKILL.md` file. The hook calls the CLI via `scripts/tooling/cursor-hook-skill-tracking.ts`.

## Schema

```sql
CREATE TABLE events (
  event_id     TEXT PRIMARY KEY,
  session_id   TEXT,
  tool_name    TEXT NOT NULL,
  tool_type    TEXT NOT NULL,   -- 'skill' | 'yarn_script' | 'cli_command'
  event_type   TEXT NOT NULL CHECK(event_type IN ('start', 'end')),
  repo         TEXT,
  agent_vendor TEXT,
  success      INTEGER,         -- 0 or 1; NULL on 'start' events
  duration_ms  INTEGER,         -- NULL on 'start' events
  metadata     TEXT,            -- JSON blob
  created_at   TEXT NOT NULL
);
```
