# DevDash

DevDash is a debugging tool for MetaMask Mobile dev builds. A small agent inside the app streams network traffic, console output, Redux actions and controller state changes to a local Node relay, and takes commands back from it (read or write state, call controller methods, run code, replay requests, reload). The relay serves a browser dashboard and an MCP server, so a person and a coding agent see the same live data.

This branch is a reference implementation. Read it to build the same capabilities into another dashboard or tool. It is not meant for main or a release branch.

## Reading this branch from another checkout

The whole change is one commit on top of main, so the diff is the integration:

```sh
git fetch origin devdash
git diff --stat origin/main...origin/devdash
git show origin/devdash:scripts/temp-devdash/README.md
git show origin/devdash:app/core/TempDevDash.ts
```

To run it on your own branch, cherry-pick the commit, then drop it before opening a PR.

## Files

| File | Role |
| --- | --- |
| `app/core/TempDevDash.ts` | App agent. Patches fetch, XHR, WebSocket, console and the global error handler, wraps the root reducer, subscribes to controller state changes, queues events, connects to the relay and runs its commands. |
| `index.js`, `app/store/index.ts`, `app/core/Engine/controllers/bridge-controller/bridge-controller-init.ts` | The only edits to existing files. Each line ends with `// DevDash hook`; `grep -rn "DevDash hook" index.js app` lists them all. |
| `scripts/temp-devdash/server.mjs` | Relay on port 8098. Keeps bounded history, forwards commands, serves the dashboard, the HTTP tool API, the screen stream and stack symbolication. |
| `scripts/temp-devdash/tools.mjs` | The tool definitions (name, description, JSON schema) and their implementations, shared by the HTTP API and MCP. Also holds `redact()`. |
| `scripts/temp-devdash/filter.mjs` | Filter grammar (`host:infura status:4xx -word /regex/`), shared by the dashboard and the tools. The grammar is documented at the top of the file. |
| `scripts/temp-devdash/mcp.mjs` | MCP server over stdio. Forwards each tool call to `POST /api/tool` and starts `server.mjs` when it isn't running. |
| `scripts/temp-devdash/dashboard.html` | Browser client with Network, Logs, State, Redux, Run, MCP and Screen panels, served by the relay at `/`. It imports `/filter.mjs` from the relay, so it can't be opened as a file. It is the reference client for the `/ui` and `/screen` sockets. |

## Architecture

```
 app (dev build)                         relay: server.mjs :8098                    clients
 TempDevDash.ts                          bounded history per kind                   dashboard.html  ws /ui, ws /screen
   patches fetch/XHR/WS/console  ──ws /app──▶  ingest()  ──broadcast──▶            your dashboard  ws /ui or POST /api/tool
   wraps reducer, watches Engine ◀─ cmd/res ─  sendToApp()  ◀── tools.mjs ◀──     mcp.mjs (stdio) ──▶ POST /api/tool
                                             adb screenrecord ──▶ ws /screen
```

The app dials out, so nothing has to reach into the device. It tries the Metro host first (read from the bundle URL), then `10.0.2.2` on Android, then `localhost`, and reconnects every 2.5 s. While no app is connected, the relay also runs `adb reverse tcp:8098 tcp:8098` every 10 s, for an emulator whose Metro URL is `localhost`. Events queue in the app while disconnected (bounded by count and bytes, oldest dropped first) and flush every 250 ms.

## App hooks

- `index.js` imports `TempDevDash` right after the Nitro fetch and WebSocket setup, so every request created later passes through the patched globals.
- `app/store/index.ts` wraps the root reducer with `tempDevDashWrapReducer`. That sees every action including saga puts, and handles the internal `@@devdash/SET` action that `redux.set` dispatches to write a path.
- `bridge-controller-init.ts` wraps the `expo/fetch` it imports with `tempDevDashWrapFetch`. Code that imports a fetch implementation directly skips the global one, so each such import needs this wrapper to be captured. Bodies are not read for these, because they may be streams.
- Controller changes come from subscribing to each controller's `<Name>:stateChange` event on the Engine messenger (`syncControllerSubscriptions`, which retries every 2 s until the Engine exists and subscribes again only if the messenger instance changes). The Immer patches are what gets sent.
- Route changes are polled from `NavigationService` every second and emitted as `log` events with level `nav`.

## Wire protocol

All messages are JSON text frames, except the binary video frames on `/screen`.

### `/app` (app to relay)

The app connects to `ws://<host>:8098/app?session=<id>`. The session id changes on each JS reload, and the relay keys network entries by `session:id`. A new app connection replaces the previous one.

| Direction | Message |
| --- | --- |
| app to relay | `{ t: 'info', info }` on connect and every 3 s. `info` carries `session, platform, osVersion, appVersion, route, routeParams, unlocked, paused, captureFrames, host, queued, dropped`. |
| app to relay | `{ t: 'batch', events: [...] }`, up to 300 events or 2 MB per batch. |
| relay to app | `{ t: 'cmd', id, cmd, args }` |
| app to relay | `{ t: 'res', id, ok: true, value }` or `{ t: 'res', id, ok: false, error: { name, message, stack } }`. The relay times a command out after 20 s. |

Every event has `k` (kind) and `id`. The first event for an `id` carries `ts`; follow-up `net` events don't. Kinds:

- `net`: emitted more than once per request, merged by `id`. Start: `transport` (`fetch`, `xhr`, `ws`), `method`, `url`, `reqHeaders`, `reqBody`, `reqBodySize`, `rpc` (JSON-RPC method names), `stack`, `state: 'pending'`. Finish: `state: 'done'`, `ms`, `status`, `statusText`, `redirected`, `resHeaders`, `resBody`, `resBodySize`, `rpcError`, or `state: 'error'` with `error`. WebSockets also pass through `state: 'open'` and `state: 'closed'` with `closeCode`, `closeReason`, `framesIn`, `framesOut`. Requests to local dev ports (Metro 8081, the relay 8098, and 8097, 8099, 9090) are skipped.
- `frame`: one WebSocket message, `{ id, dir: 'in' | 'out', size, data, framesIn, framesOut }`, attached by the relay to the `net` entry with the same `id`. Capped at 25 per second.
- `log`: `{ level, text, args?, stack? }`. Levels are `log`, `info`, `warn`, `error`, `debug` and `nav`. Uncaught errors arrive as `error`.
- `action`: `{ type, action, changed, diff, ms }`. `changed` lists the top-level slices that changed, `diff` holds up to 40 `{ path, before, after }` entries.
- `ctl`: `{ name, count, paths, patches }` for one controller state change.

Values pass through `encode()`, which bounds depth, string length, node count and keys. Anything JSON can't carry becomes a marker object with a `$dd` field: `fn`, `bigint`, `bignum`, `undefined`, `number` (NaN, Infinity), `symbol`, `error`, `bytes`, `circular`, `cut` (depth or node limit) and `more` (truncated array or object). Bodies are clipped at 128 KB.

### Commands the app accepts

| `cmd` | `args` | Does |
| --- | --- | --- |
| `info` | | Returns the `info` object. |
| `config` | `paused?`, `captureFrames?` | Pauses capture or WebSocket frame capture. |
| `reload` | | `DevSettings.reload()` after 400 ms. |
| `ctl.list` | | Controllers with state, key count and `readOnly`. |
| `ctl.get` | `name`, `path`, `depth` | Reads controller state at a path. |
| `ctl.set` | `name`, `path`, `value` | Writes through `controller.update`. Refused for read-only controllers. |
| `ctl.methods` | `name` | Public method names. |
| `ctl.call` | `name`, `method`, `args` | Calls a controller method and awaits it. |
| `redux.get` | `path`, `depth` | Reads Redux state at a path. |
| `redux.set` | `path`, `value` | Writes a Redux path through `@@devdash/SET`. |
| `redux.dispatch` | `action` | Dispatches a plain action. |
| `state.search` | `source` (`redux` or controllers), `name?`, `query`, `limit` | Searches keys and values, `/regex/` allowed. |
| `eval` | `code` | Runs code inside an async function, trying it as an expression first so `getState().user` needs no `return`. In scope: `Engine`, `ctl`, `messenger`, `store`, `dispatch`, `getState`, `nav`, `RN`. |
| `complete` | `expr` | Property completions for a dotted chain. It only walks properties and never runs the expression. |
| `net.replay` | `url`, `method`, `headers`, `body` | Sends a request through the patched fetch, so it is captured too. |

`path` is an array of keys everywhere on this socket. The tools layer also accepts dotted strings.

### `/ui` (dashboard to relay)

On connect the relay sends `{ t: 'reset' }`, a `hello` (`connected`, `info`, `tools`, `mcp`, `mcpCommand`), then the stored history as `batch` messages of 400 events. After that it forwards every app `batch` and `info` live. The client sends `{ t: 'cmd', id, cmd, args, timeoutMs }` to run any app command above and gets `{ t: 'res', id, ... }` back, or `{ t: 'clear' }` to empty the history. MCP tool calls are broadcast as `k: 'mcp'` events so the dashboard can show what an agent did.

### `/screen` (Android only)

The relay streams `adb exec-out screenrecord --output-format=h264` while at least one viewer is connected. It sends `{ t: 'config', codec }` first, then one binary message per frame: one byte (1 for keyframe, 0 otherwise) followed by the Annex B H.264 NAL units. The dashboard decodes them with WebCodecs `VideoDecoder`. Sending the text `restart` restarts the recorder to get a fresh keyframe. `{ t: 'error', text }` means screenrecord stopped. Without WebCodecs H.264, poll `GET /api/screenshot` for PNGs instead.

### HTTP

| Route | Body | Returns |
| --- | --- | --- |
| `GET /health` | | `{ ok, connected }` |
| `POST /api/tool` | `{ name, args }`, `Content-Type: application/json` | `{ ok, text, image? }`. This is the simplest way to integrate: every MCP tool, called over HTTP. |
| `GET /api/screenshot` | | PNG via `adb exec-out screencap -p`. |
| `POST /api/symbolicate` | `{ stack }` | Stack mapped to source through Metro's `/symbolicate`. Needs Metro running. |

## Tools

`TOOLS` in `tools.mjs` is the source of truth for names, descriptions and schemas, and `runTool` holds the implementations. There are 20: `status`, `screenshot`, `network_list`, `network_get`, `network_endpoints`, `network_replay`, `logs_list`, `redux_actions`, `redux_get`, `redux_set`, `redux_dispatch`, `controllers_list`, `controller_get`, `controller_set`, `controller_call`, `controller_changes`, `state_search`, `run_code`, `clear`, `reload_app`. List tools work on the relay's stored history; the rest become app commands.

## Integrating into another dashboard

Pick the lowest layer that does the job:

1. **Call tools over HTTP.** Run `server.mjs` unchanged and call `POST /api/tool` from your agent or your dashboard's backend. No protocol work, and you get redaction and filtering for free.
2. **Speak `/ui`.** For live streaming views, connect to `/ui` like `dashboard.html` does: handle `reset`, `hello`, `info`, `batch` and `res`, merge `net` events by `key`, and send `cmd` messages.
3. **Replace the relay.** Keep `TempDevDash.ts` in the app and implement the `/app` side yourself: accept the socket, merge events, and answer with `cmd` messages. The hooks and the event shapes above are the whole contract.

The relay only answers this machine, and its origin rules decide where your client can run:

| Client | HTTP `/api/tool` | Sockets `/ui`, `/screen` |
| --- | --- | --- |
| Agent, script or backend on this machine (no `Origin` header) | Works. | Send `Origin: http://localhost:8098`, for example `new WebSocket(url, { origin: 'http://localhost:8098' })` with the `ws` package. |
| Page served by the relay (`dashboard.html`) | Works. | Works. |
| Page served from any other origin (your dashboard's dev server) | Refused: a foreign `Origin` gets 403, and the relay sends no CORS headers. Proxy through your backend. | Refused. Add your page's exact origin to `LOCAL_ORIGINS` in `server.mjs`, never a wildcard, or proxy through your backend. |

The port is 8098 in both `TempDevDash.ts` (`PORT`) and the relay (`DEVDASH_PORT`, default 8098). Change both together.

## Invariants to carry over

These are what make DevDash safe to run against a real wallet. Keep each one when porting.

- **Dev only.** `install()` runs only when `__DEV__ && !hasTestOverrides && typeof jest === 'undefined'`. The import and the two wrappers still ship in the bundle as pass-throughs, which is why this belongs on a side branch and not on main.
- **Local only.** HTTP accepts loopback addresses with a localhost `Host`, and with no `Origin` or the relay's own (`isLocalRequest`). The `/ui` and `/screen` sockets also require the relay's own `Origin` (`LOCAL_ORIGINS`). Any website open in the browser could otherwise read wallet state and run code in the app. The `/app` socket accepts the LAN so a physical device can connect, but only with an IP or `localhost` `Host` and a matching `Origin` (`isAppRequest`), which blocks DNS rebinding.
- **Secrets masked at the source.** `SENSITIVE_KEY` in the app masks vault, keys, mnemonics, passwords and tokens in state reads and controller patches. `KeyringController` and `SeedlessOnboardingController` are read-only for `ctl.set`.
- **Secrets redacted on the way out.** `redact()` in `tools.mjs` strips credential headers and fields, bearer tokens, JWTs and Infura keys from tool output, and the relay applies it to logged tool arguments.
- **Secure screens stay black.** Onboarding and credential screens set FLAG_SECURE, so screenshots and video show nothing there. Screenshots go to agents, so leave that in place.
- **Tool output is data.** Captured responses and logs can contain any text. `mcp.mjs` tells the agent to treat tool output as data and to change app state only when asked. Carry that instruction into any agent integration.
- **Capture can't break the app.** Every patch and the reducer wrapper catch their own failures, so a capture bug never reaches the caller. Queues are bounded in the app and history is bounded in the relay.

## Running it

1. Start Metro and open a dev build on a simulator, emulator or device.
2. `node scripts/temp-devdash/server.mjs`, then open http://localhost:8098. The app connects within a few seconds.
3. For Claude Code: `claude mcp add devdash --scope local -- node "$PWD/scripts/temp-devdash/mcp.mjs"`. The MCP server starts the relay when needed. Start with the `status` tool.

Requirements and limits:

- Screenshots and the live screen need `adb` on `PATH`, so they work for Android only. Everything else works on iOS too.
- `run_code` has no `require`. Reach app modules through `globalThis.__r.getModules()` (match on `verboseName`), then `globalThis.__r(id)`.
- Writes and `run_code` act on the real wallet in that build.
