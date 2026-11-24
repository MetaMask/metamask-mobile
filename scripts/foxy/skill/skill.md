---
name: foxy
description: Gets the Foxy network-request dashboard (TRAM-4463) running and explains what it shows. Use when someone wants to run Foxy or `yarn foxy`, audit which network requests the MetaMask Mobile app makes, find who or which screen made a request, or when Foxy shows no requests, the Android or physical iPhone cannot connect, owner chips are missing, or the dashboard will not start. Covers prerequisite checks, the one-command setup, troubleshooting and the MCP tools.
maturity: experimental
---

# Foxy

Foxy captures every `fetch` and `XMLHttpRequest` the app makes in a debug build, with the JS call stack, the code owner of the calling file and the screen the app was showing. It runs as a local server plus a browser dashboard. Everything lives in `scripts/foxy/` (server, dashboard, tests) and `app/dev-tools/Foxy/` (the bridge inside the app). `scripts/foxy/README.md` is the full reference for the dashboard.

This skill only applies to MetaMask Mobile. If `scripts/foxy/server.mjs` does not exist in the checkout, stop and tell the user this branch does not include Foxy.

## The normal path: one command

For a person on the Foxy branch the whole flow is **switch branch, `yarn install`, `yarn foxy`**. Do not walk them through manual steps first. Run:

```bash
yarn foxy
```

It runs `scripts/foxy/setup.mjs`, which fixes everything below that it can, then starts the server on <http://localhost:8098>.

| Prerequisite | What `yarn foxy` does about it |
| --- | --- |
| Node version | Compares with `engines.node` and warns on a mismatch |
| `ws` package | Comes from the root `yarn install`; stops with the exact command if missing |
| `FOXY="true"` in `.js.env` | Creates `.js.env` from `.js.env.example` if absent, turns the flag on (uncomments or adds it). Never touches `FOXY_URL` or `FOXY_BODIES` |
| Metro restart | Tells the user to run `yarn watch:clean` when `.js.env` changed, because the flag is read when the bundle is built |
| Metro reachable on `:8081` | Warns when it is not, since stacks are symbolicated through it |
| Owner chips for `@metamask/*` | Uses a sibling `../core` checkout, otherwise downloads core's `CODEOWNERS` into `scripts/foxy/.cache/` (refreshed weekly) |
| Android device or emulator | Runs `adb reverse tcp:8098 tcp:8098` for every attached device |
| Physical iPhone | Prints the exact `FOXY_URL` line with the Mac's LAN address |
| Port `8098` | Says so when another program owns it, and exits quietly when Foxy is already running |
| This skill | Installs itself into `.claude/skills`, `.agents/skills` and `.cursor/skills` (all gitignored) |

Afterwards the user has to do the parts only they can: build or start the debug app (`yarn start:ios` or `yarn start:android`, JS-only changes need no native rebuild), launch it, and watch the Timeline. Press `M` in the dashboard to drop a marker such as "Onboarding visible" so the capture splits into phases.

## Diagnosing without changing anything

```bash
node scripts/foxy/setup.mjs --check
```

Prints the same checklist but writes nothing, so it is safe to run first when someone says "Foxy does not work". Read its output before guessing.

## Troubleshooting

Work down this list. Most problems are the first two.

1. **Dashboard is empty.** The app never connected. Check in order:
   - `.js.env` has `export FOXY="true"` and Metro was restarted with `yarn watch:clean` afterwards (the flag is read when the bundle is built, so a plain reload may keep the old value).
   - The app is a debug build. Foxy is a no-op in release builds.
   - Android: `adb reverse tcp:8098 tcp:8098` for the device in use (`adb devices`). Re-run `yarn foxy` after plugging in or restarting an emulator.
   - Physical iPhone: set `export FOXY_URL="ws://<mac-lan-ip>:8098/app"` in `.js.env` (the phone and Mac must be on the same network), then restart Metro.
   - Requests made before JS loads (native prefetches) are never seen. That is a limit, not a bug.
2. **Call sites are not shown as `app/...` files.** Foxy symbolicates stacks through Metro, so it has to be running on `:8081`. Start it, or set `FOXY_METRO` to its URL.
3. **No team chips on `@metamask/*` calls.** Core `CODEOWNERS` is missing: reconnect to the internet and re-run `yarn foxy`, or clone `MetaMask/core` next to this repo. App files with no owner show `unowned`; that is correct.
4. **"Launched from" says "Not reported".** That capture came from an older build of the app. Restart the app once.
5. **Port in use.** `lsof -ti tcp:8098` shows the owner. If it is an earlier Foxy, open the dashboard instead; otherwise stop it or set `FOXY_PORT` and make `FOXY_URL` match.
6. **GitHub links point at the wrong lines.** Links use `HEAD` when it is on a remote branch, otherwise the merge-base with `origin/main`. Push the branch, or set `FOXY_GITHUB_REPO` and `FOXY_GITHUB_REF`.

## Safety rules for agents

- Never turn on `FOXY_BODIES`. It records request and response bodies, which can contain tokens and personal data. Only suggest it when the user asks and is using a throwaway wallet.
- `.js.env` is gitignored and holds the user's local secrets. Edit only the `FOXY*` lines, never print the file, never commit it.
- Header values for credentials are already redacted by Foxy; do not try to recover them.

## Reading the data (agents)

Humans use the dashboard. Agents can read the same capture through the MCP server:

```bash
claude mcp add foxy -- node scripts/foxy/mcp.mjs
```

Tools: `network_list`, `network_get`, `network_summary`, `network_export_markdown`, `marker_add`, `network_clear`, `status`. Use `marker_add` to label what the app is doing, `network_summary` to find identical duplicates, failures and third-party chatter, and `network_export_markdown` for a markdown table to paste wherever you are writing it up. An old capture can be replayed without an app: `node scripts/foxy/replay.mjs [logfile] [port]`.

## Changing Foxy itself

- Run the tests: `node --test scripts/foxy/*.test.mjs` and `yarn jest app/dev-tools/Foxy`.
- Prerequisite logic is `scripts/foxy/setup.mjs` (pure helpers, covered by `setup.test.mjs`). Add a new prerequisite there, and a row to the table above.
- This file is authored at `scripts/foxy/skill/skill.md`. The copies in `.claude`, `.agents` and `.cursor` are generated by `setup.mjs`; edit the source, not the copies.
