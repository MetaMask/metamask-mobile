# Ramps debug dashboard

Local WebSocket relay between MetaMask Mobile (`RampsDebugBridge`) and the browser UI.

**App setup (env vars, devices, `adb reverse`):** see [`app/components/UI/Ramp/debug/README.md`](../app/components/UI/Ramp/debug/README.md).

## Session log (for Cursor / agents)

Every message the mobile app sends is appended to a **JSON Lines** file (one JSON object per line) so an agent can read the same stream you see in the browser:

- **Default path:** `ramps-debug-dashboard/logs/ramps-debug.jsonl` (gitignored)
- **Override:** `RAMPS_DEBUG_LOG_FILE=/absolute/path/custom.jsonl node server.mjs`

Each line includes the same `type`, `args`, `result`, `state`, etc. as the dashboard, plus `_serverReceivedAt` (ms since epoch) when the server wrote the line.

## Run

From this directory, install deps once (not part of the root mobile workspace):

```bash
npm ci
node server.mjs
```

(`yarn start` may fail when this folder is nested under the main Yarn workspace; `npm ci` + `node server.mjs` is reliable.)

Optional port: `RAMPS_DEBUG_PORT=8100 node server.mjs` — set `RAMPS_DEBUG_DASHBOARD_URL` in `.js.env` to match.
