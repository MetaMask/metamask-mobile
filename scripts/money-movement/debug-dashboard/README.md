# Ramps debug dashboard

Host-side dev tool under **`scripts/money-movement/`** (see `.github/CODEOWNERS`). WebSocket relay between MetaMask Mobile (`RampsDebugBridge`) and the browser UI.

**App setup (env vars, devices, `adb reverse`):** see [`app/components/UI/Ramp/debug/README.md`](../../../app/components/UI/Ramp/debug/README.md).

## Session log (for Cursor / agents)

Every message the mobile app sends is appended to a **JSON Lines** file (one JSON object per line) so an agent can read the same stream you see in the browser:

- **Default path:** `scripts/money-movement/debug-dashboard/logs/ramps-debug.jsonl` (gitignored)
- **Override:** `RAMPS_DEBUG_LOG_FILE=/absolute/path/custom.jsonl node server.mjs`

Each line includes the same `type`, `args`, `result`, `state`, etc. as the dashboard, plus `_serverReceivedAt` (ms since epoch) when the server wrote the line.

## Run

From the **repo root** (recommended):

```bash
yarn ramps:debug-dashboard
```

Same thing as `bash run.sh` in this directory (`run.sh` runs `npm ci` only if `node_modules/ws` is missing, then `node server.mjs`).

The dashboard loads **DOMPurify** from the jsDelivr CDN (pinned version in `dashboard.html`). Requires network access when opening the page.

Optional port: `RAMPS_DEBUG_PORT=8100 yarn ramps:debug-dashboard` (from repo root) or `RAMPS_DEBUG_PORT=8100 node server.mjs` here — if you change the port, update `DASHBOARD_WS_URL` in `RampsDebugBridge.ts` to match.
