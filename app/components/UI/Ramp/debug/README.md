# RAMPS debug dashboard (developer tooling)

Opt-in tooling that streams `RampsController` state, method calls, and related fetch traffic to a **local WebSocket server** and browser UI. It is **not** used in production builds.

**Ownership:** Ramps team (see `.github/CODEOWNERS` for `app/components/UI/Ramp/` and `scripts/money-movement/`).

## Quick start

From the **repository root**:

1. **Install dashboard dependencies** (first time, or after `package-lock.json` changes):

   ```bash
   yarn ramps:debug-dashboard:install
   ```

2. **Start the dashboard** (HTTP + WebSocket on port **8099**):

   ```bash
   yarn ramps:debug-dashboard
   ```

3. Open **<http://localhost:8099>** in a browser.

4. **In the app:** set `RAMPS_DEBUG_DASHBOARD="true"` in **`.js.env`**, restart Metro (`yarn watch:clean` or your watcher), run a **debug** build. When the app connects, the server logs `Mobile app connected`.

The dashboard lives under **`scripts/money-movement/debug-dashboard/`** (same pattern as e.g. `scripts/perps/`). It is **not** part of the root Yarn workspace; **`npm ci`** is used there on purpose. Root `yarn` scripts wrap it so you do not need to `cd` into that folder.

## Enable in the app

Values are read via **`app/util/environment.ts`** (`isRampsDebugDashboardEnabled`, `getRampsDebugDashboardWebSocketUrl`), same as other dev flags: `process.env` is **inlined at bundle time** by Babel (`transform-inline-environment-variables`) from `.js.env` when Metro runs — there is no separate runtime env loader for these keys.

1. In **`.js.env`** (copy from `.js.env.example` if needed), set:

   ```bash
   export RAMPS_DEBUG_DASHBOARD="true"
   ```

2. **Restart Metro** (`yarn watch:clean` or your usual watcher) so the variable is inlined at bundle time.

3. Run a **debug** build (`__DEV__`).

Until `RAMPS_DEBUG_DASHBOARD` is `true`, the bridge module is **not** loaded (dynamic `import()` from `ramps-controller-init.ts`).

### WebSocket URL

Default: `ws://localhost:8099`.

Override if the app cannot reach your machine as `localhost`:

| Setup                | Typical override                                                                                     |
| -------------------- | ---------------------------------------------------------------------------------------------------- |
| **iOS Simulator**    | Default is usually fine.                                                                             |
| **Android Emulator** | `export RAMPS_DEBUG_DASHBOARD_URL="ws://10.0.2.2:8099"` (host loopback), or use `adb reverse` below. |
| **Physical device**  | `export RAMPS_DEBUG_DASHBOARD_URL="ws://<your-mac-lan-ip>:8099"`                                     |

**Android device / emulator with `localhost` in app → host:**

```bash
adb reverse tcp:8099 tcp:8099
```

Then you can keep the default `ws://localhost:8099` from the app’s point of view.

## Run the dashboard server (manual)

Equivalent to the root scripts:

```bash
yarn ramps:debug-dashboard:install   # once / when lockfile changes
yarn ramps:debug-dashboard
```

Or from **`scripts/money-movement/debug-dashboard/`**:

```bash
npm ci && node server.mjs
```

- UI: <http://localhost:8099>
- WebSocket: `ws://localhost:8099`
- Optional: `RAMPS_DEBUG_PORT=8100 yarn ramps:debug-dashboard` (and set `RAMPS_DEBUG_DASHBOARD_URL` in `.js.env` to match).

`yarn start` inside **`scripts/money-movement/debug-dashboard/`** can fail under the root Yarn workspace; prefer the root **`yarn ramps:debug-dashboard`** commands or **`npm ci` + `node server.mjs`** in that directory.

Session log (JSON Lines, useful for agents / offline review):

- Default: `scripts/money-movement/debug-dashboard/logs/ramps-debug.jsonl`
- Override: `RAMPS_DEBUG_LOG_FILE=/absolute/path.jsonl node server.mjs`

## Verify

1. Server terminal should show `Mobile app connected` after the app boots.
2. Metro / device logs: `[RampsDebug] Connected to debug dashboard`.

## Related code

- `RampsDebugBridge.ts` — WebSocket client, controller method wrapping, fetch instrumentation.
- `app/core/Engine/controllers/ramps-controller/ramps-controller-init.ts` — `__DEV__` + env-gated dynamic import.
