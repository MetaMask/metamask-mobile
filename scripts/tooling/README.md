# scripts/tooling — Developer Usage Collection

Automatically records how AI agent tooling (Yarn scripts, Claude Code skills, Cursor skills) is used into a local CSV log. Developer-only, stored locally, never sent anywhere.

## How it works

Every collection path appends one CSV row to a project-scoped log file:

- `start` when a skill or Yarn script begins

The log accumulates locally. The [dev-tooling-explorer](https://github.com/MetaMask/dev-tooling-explorer) and a nightly cron job drain the log into SQLite for reporting and summarisation.

## Skip conditions

Collection is **disabled** when either of these is true:

| Condition                            | How to trigger                                         |
|--------------------------------------|--------------------------------------------------------|
| `CI` env var is set                  | Automatic on GitHub Actions and most CI systems        |
| `TOOL_USAGE_COLLECTION_OPT_IN=false` | Set in your shell profile or `.env` to opt out locally |

All three collection paths (Yarn plugin, Claude hook, Cursor hook) check both conditions. The shell dispatchers exit immediately when either is set — zero filesystem or subprocess overhead. The Cursor entry script emits `{"permission":"allow"}` before the guard so tool use is never blocked.

## Log file location

| Scenario | Path |
|---|---|
| Default | `~/.tool-usage-collection/metamask-mobile-events.log` |
| Custom | Set `TOOL_USAGE_COLLECTION_LOG_PATH` to any absolute path |

### Log format

One CSV row per event, no header line:

```
tool_name,tool_type,event_type,agent_vendor,session_id,success,duration_ms,created_at
```

Example rows:

```
skill:pr-create,skill,start,cursor,abc-123,,,2026-05-12T10:00:00Z
yarn:test:unit,yarn_script,start,,,true,8423,2026-05-12T10:01:00Z
```

Appends are done with `printf … >> file` (Yarn plugin) or `fs.appendFileSync` (Yarn Berry plugin), both of which are atomic for single-line writes on macOS/Linux.

## Architecture

```mermaid
flowchart LR
    yarn[Yarn Berry plugin\nwrapScriptExecution]
    claude[Claude Code PreToolUse hook\n.claude/settings.json]
    cursor[Cursor preToolUse hook\n.cursor/hooks.json]
    cursor_entry[hook-cursor-dispatch.sh\nprints allow + sources common]
    claude_entry[hook-claude-dispatch.sh\nsources common]
    common[hook-common.sh\nCI guard · skill extract · CSV append]
    log[(~/.tool-usage-collection/\nmetamask-mobile-events.log)]
    explorer[dev-tooling-explorer\nor nightly cron]
    db[(SQLite DB\n~/.tool-usage-collection/events.db)]

    yarn -->|appendFileSync CSV line| log
    claude --> claude_entry --> common
    cursor --> cursor_entry --> common
    common -->|printf CSV line| log
    log -->|drain on demand| explorer --> db
```

## Files

| File | Purpose |
|---|---|
| `hook-cursor-dispatch.sh` | Cursor entry point — emits `{"permission":"allow"}` unconditionally, then sources common |
| `hook-claude-dispatch.sh` | Claude entry point — sources common |
| `hook-common.sh` | Shared logic — CI/opt-out guard, skill extraction, CSV append; receives agent name as `$1` |
| `hook-skill-tracking-dispatch.test.ts` | Jest tests for both entry scripts (runs shell scripts via `child_process`) |

## Collection paths

### Path 1 — Yarn Berry plugin

`.yarn/plugins/plugin-usage-tracking.cjs` wraps every `yarn <script>` via `wrapScriptExecution`. On `start` it appends a CSV row; on `finish` it updates `success` and `duration_ms` in a second row.

### Path 2 — Claude Code skills

`.claude/settings.json` registers a project-level `PreToolUse` hook for the `Skill` tool pointing to `hook-claude-dispatch.sh`. That script sources `hook-common.sh` which extracts the skill name from the `"skill"` field in the tool input, appends one CSV row, and exits.

### Path 3 — Cursor skills

`.cursor/hooks.json` registers a `preToolUse` hook pointing to `hook-cursor-dispatch.sh`. That script emits `{"permission":"allow"}` as its first output (unconditionally), then sources `hook-common.sh` which extracts the skill name from the SKILL.md file path in the payload (matches `.agents/skills/`, `.cursor/skills/`, or `.claude/skills/`) and appends one CSV row.

## Inspecting the log

```bash
# Tail live events
tail -f ~/.tool-usage-collection/metamask-mobile-events.log

# Count skill uses by name
awk -F, '{print $1}' ~/.tool-usage-collection/metamask-mobile-events.log | sort | uniq -c | sort -rn
```

To see events in the SQLite database populated by the explorer or cron:

```bash
sqlite3 ~/.tool-usage-collection/events.db \
  "SELECT tool_name, tool_type, event_type, agent_vendor, created_at FROM events ORDER BY created_at DESC LIMIT 20;"
```

