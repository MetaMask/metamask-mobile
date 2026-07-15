# RAMPS debug dashboard (developer tooling)

Streams `RampsController` state, method calls, and related fetch traffic to a **local WebSocket server** and browser UI. **Debug builds only** (`__DEV__`); production is unchanged.

**Opt-in:** set `RAMPS_DEBUG_DASHBOARD=true` in **`.js.env`** (or export it in the shell before starting Metro). Without this, the app does **not** load the bridge, so most devs avoid extra fetch instrumentation and WebSocket reconnect attempts.

**Ownership:** Ramps team (see `.github/CODEOWNERS` for `app/components/UI/Ramp/` and `scripts/money-movement/`).

## Quick start

1. Enable the bridge for local debug builds — add to **`.js.env`** (see `.js.env.example`):

   ```bash
   export RAMPS_DEBUG_DASHBOARD="true"
   ```

   Restart Metro after changing `.js.env`.

2. From the **repository root**, start the dashboard (installs `ws` under `scripts/money-movement/debug-dashboard/` on first run, then starts the server):

   ```bash
   yarn ramps:debug-dashboard
   ```

3. Open **<http://localhost:8099>** in a browser.

4. Run the app in a **debug** build. When RAMPS initializes, the server logs `Mobile app connected`.

The app connects to **`ws://localhost:8099`** when the bridge is enabled.

### Android emulator / device → host

So the app can reach the dashboard on your machine:

```bash
adb reverse tcp:8099 tcp:8099
```

### Optional (dashboard server / shell)

- **Different port:** `RAMPS_DEBUG_PORT=8100 yarn ramps:debug-dashboard` — the app still uses `ws://localhost:8099` (port is on the host); change the bridge URL in `RampsDebugBridge.ts` if you need a non-default port.
- **Session log path:** `RAMPS_DEBUG_LOG_FILE=/path/to/log.jsonl` when running the server (see dashboard `README.md`).

## Manual run

From **`scripts/money-movement/debug-dashboard/`**: `npm ci && node server.mjs` (or `bash run.sh` from that directory).

## Verify

1. Server: `Mobile app connected`
2. Metro / device: `[RampsDebug] Connected to debug dashboard`

## Related code

- `RampsDebugBridge.ts` — WebSocket client, controller wrapping, fetch instrumentation.
- `app/core/Engine/controllers/ramps-controller/ramps-controller-init.ts` — `__DEV__`-gated `require` and `isRampsDebugDashboardEnabled()`.
