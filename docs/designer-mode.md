# Designer Mode

**Close the gap between design and code.** Designer Mode is an in-app visual
inspector for MetaMask Mobile. Tap any component in the running app to see its
styles, tweak them inline, and send the change to an AI coding agent, which
applies it to the source. Hot reload shows the result in seconds — no mockup
hand-off, no waiting on a padding change.

It is **dev/QA-only** and ships disabled. It does nothing unless you opt in with
the `DESIGNER_MODE=true` environment variable.

---

## For designers — enable & use

### 1. Run the app with Designer Mode enabled

The flag is inlined when Metro bundles the JS, so it must be set on the Metro
(watch) process, and Metro's cache must be cleared when you toggle it.

**Add the flag to your local `.js.env`** (it's gitignored and per-developer, the
same place other dev flags live):

```bash
# .js.env
export DESIGNER_MODE=true
```

Then **get the app running by following the [README "Getting started"](../README.md#getting-started)**
(Expo dev build — recommended — or the native flow). Designer Mode adds just one
requirement on top: the bundler must run with a **clean cache** so the flag is
re-inlined — use `yarn watch:clean` in place of `yarn watch`:

```bash
yarn watch:clean
```

> **Cache clear is required on toggle.** Metro's transform cache doesn't track
> env-var values, so you **must** run `yarn watch:clean` the first time after
> adding (or removing) the flag — a normal `yarn watch` (cached) won't pick up
> the change and the 🎨 button won't appear. Once it's enabled, subsequent plain
> `yarn watch` runs are fine. The flag stays on for **all** local builds until
> you remove the line.

### 2. Ask your developer/agent to "enter design mode"

In Claude Code (run from the repo root) say:

> enter design mode

The agent starts the relay server and begins listening. You'll get a confirmation
message in chat.

### 3. Inspect and request changes

1. In the app, tap the **🎨** button (bottom-right) to activate the inspector.
2. **Tap any component** — the panel opens with its name, file path, layout,
   spacing, typography, colors, and style names.
3. **Edit inline** — tap a value (padding, color, font size, border radius, the
   text content…) and change it. Edits collect as a pending changeset.
4. **Describe or apply** — type a request in the chat box (e.g. "make this card's
   corners rounder and the title bigger") and/or hit **Apply** to send your inline
   edits.
5. The agent edits the source, hot reload updates the app, and a **Done** reply
   appears in the panel. Repeat until it's right.

A connection dot in the panel footer shows whether the app can reach the relay:
green = connected, red = the relay isn't running (ask the agent to enter design
mode), checking = still probing.

> **Tip:** No relay handy? Tap **Copy for AI** to copy a full, structured
> description of the component + your edits and paste it into any chat.

---

## How it works

```
App (🎨 inspector panel)
    │  POST /api/message  (the tapped component + your edits + message)
    ▼
Relay server  (bundled with the designer-mode skill, on the dev machine, port 3334)
    ▲  the agent blocks on GET /api/wait until a request arrives
    │
AI agent (Claude Code)
    │  reads the request → edits the source files → hot reload
    │  POST /api/response  ("Done — …")  → app polls GET /api/poll
    ▼
App panel shows the agent's reply
```

There are three pieces:

1. **The inspector** — built into the app, behind the `DESIGNER_MODE` flag.
2. **The relay server** — a small Node script **bundled with the `designer-mode`
   skill**. The skill is currently **experimental**, so a plain `yarn skills`
   skips it — opt in explicitly with `yarn skills --include ui/designer-mode`
   (the agent starts the relay for you).
3. **The agent skill** — `.claude/skills/mms-designer-mode/SKILL.md`, which tells the
   agent to run the relay and **block on `/api/wait`** for each request. This is a
   pull loop (no stdout-watching/"monitor" tool needed), so it works with any
   agent that can run a shell command — Claude Code, Cursor, Codex, Aider, Gemini.

---

## For developers / agents — the loop

The skill (`.claude/skills/mms-designer-mode/SKILL.md`) drives this, but the loop is a
simple **blocking long-poll** — no stdout-watching tool required:

```bash
# 1. Start the relay once, in the background (bundled with the designer-mode skill).
node .claude/skills/mms-designer-mode/scripts/server.mjs &

# 2. Block until the next request arrives, then handle it. Repeat forever.
#    /api/wait returns the request body the instant the app sends one, or empty
#    after ~10 min idle (just call it again). Apply the change, then reply:
while true; do
  REQ=$(curl -sS --max-time 590 http://localhost:3334/api/wait)
  [ -z "$REQ" ] && continue          # idle timeout (~10 min) — re-arm
  # …read $REQ, edit the referenced source files…
  curl -s -X POST http://localhost:3334/api/response \
    -H "Content-Type: text/plain" \
    -d "Done — bumped Card borderRadius to 12 and title to 20"
done

# Stop when finished:
pkill -f "designer-mode/scripts/server.mjs"
```

> An agent doesn't use a literal `while` loop — it issues `curl /api/wait` as one
> (foreground, blocking) tool call, handles the result, replies, and issues the
> next `/api/wait`. The blocking call returning is what "wakes" the agent, which is
> why no push/monitor mechanism is needed. In Claude Code, give that `Bash` call a
> `timeout` of `600000` ms (the max) so it isn't killed mid-wait — the server
> returns within ~580s (`server 580s < curl --max-time 590 < Bash 600000`).

### Permissions

Your agent will ask to approve the relay commands (`node .claude/skills/mms-designer-mode/scripts/server.mjs`
and the `curl` calls to `localhost`) the first time it runs them — these are normal
tool-permission prompts. Approve them. To avoid being re-prompted on every re-arm,
choose your harness's **"don't ask again"** option, or allow them in **your own**
local agent settings (e.g. Claude Code's `.claude/settings.local.json`).

This is a per-developer choice — the repo intentionally does **not** ship shared
allow-rules for these commands, so each dev opts in however they prefer.

### Harness support

The agent picks the delivery mechanism from **its own tools** — there's nothing to
configure per product:

- **Blocking loop (universal)** — the agent blocks on `/api/wait`; works on anything
  that can run a shell command (Claude Code, Codex, Aider, Gemini, Cursor).
- **Event-driven (when the agent has a wake-on-output tool)** — the server also
  streams each request to its stdout (delimited
  `=== DESIGNER MODE REQUEST … === END ===`), so an agent with a "notify on output" /
  "await shell until regex" capability (e.g. Cursor) can be woken per request block
  instead of polling — instant, with fewer permission prompts.

Either way it's the agent's choice based on what it can confirm it supports; the
relay serves both paths simultaneously, so nothing changes on the repo side.

Each request block returned by `/api/wait` looks like:

```
=== DESIGNER MODE REQUEST (React Native) ===

Selected Component
  Component : Text
  Parent    : Card
  File      : app/components/UI/SomeCard/SomeCard.tsx:42
Style Names
  styles.title
Styles
  fontSize : 16
  color : #ffffff
Changeset (inline edits)
  fontSize : 16 → 20
Designer Message
  "make the title bigger"

=== END ===
```

Apply changes to the referenced file and `StyleSheet.create` names, following the
repo's conventions (design tokens / `useTailwind` where already used, otherwise
edit the named `StyleSheet` entries).

---

## Configuration

| Variable           | Where                                       | Default  | Purpose                                                                                             |
| ------------------ | ------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------- |
| `DESIGNER_MODE`    | Metro / bundle (inline prefix or `.js.env`) | _(off)_  | `true` enables the in-app inspector (cache-clear required when toggled)                             |
| `DESIGNER_PORT`    | relay server                                | `3334`   | Relay server port                                                                                   |
| `DESIGNER_WAIT_MS` | relay server                                | `580000` | How long `/api/wait` blocks before re-arming (~10 min; kept just under agents' max command timeout) |

The relay binds **loopback only** (`127.0.0.1`). The app reaches it with a
per-platform default — `localhost` on the iOS simulator and `10.0.2.2` (the
emulator's host-loopback alias) on the Android emulator — so no configuration is
needed. Physical devices are not supported in this version (the relay is never
exposed on the LAN).

---

## Notes & limitations

- **Not in production.** When `DESIGNER_MODE` isn't `true`, the inspector module
  (and its `StyleSheet.create` instrumentation) is dead-code-eliminated at bundle
  time and never loads.
- **Style-name coverage.** Style names (`styles.foo`) resolve for styles created
  after the inspector loads. Most are covered; some created very early in startup
  may show only resolved values, not names — the agent can still locate them by
  file path and value.
- **Physical devices.** The phone and dev machine must be on the same network and
  able to reach port `3334`. A VPN or firewall on the dev machine can block this.
