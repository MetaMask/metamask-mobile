# RAMPS debug dashboard (developer tooling)

Opt-in tooling that streams `RampsController` state, method calls, and related fetch traffic to a **local WebSocket server** and browser UI. It is **not** used in production builds.

**Ownership:** Money Movement team (see `.github/CODEOWNERS` for `app/components/UI/Ramp/`).

## Enable in the app

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

## Run the dashboard server

From the **repository root**:

```bash
cd ramps-debug-dashboard && npm ci && node server.mjs
```

- UI: <http://localhost:8099>
- WebSocket: `ws://localhost:8099`
- Optional: `RAMPS_DEBUG_PORT=8100 node server.mjs` to change the port (set `RAMPS_DEBUG_DASHBOARD_URL` to match).

`yarn start` in that folder may fail under the root Yarn workspace; use **`npm ci`** (once) then **`node server.mjs`**.

Session log (JSON Lines, useful for agents / offline review):

- Default: `ramps-debug-dashboard/logs/ramps-debug.jsonl`
- Override: `RAMPS_DEBUG_LOG_FILE=/absolute/path.jsonl node server.mjs`

## Verify

1. Server terminal should show `Mobile app connected` after the app boots.
2. Metro / device logs: `[RampsDebug] Connected to debug dashboard`.

## Related code

- `RampsDebugBridge.ts` — WebSocket client, controller method wrapping, fetch instrumentation.
- `app/core/Engine/controllers/ramps-controller/ramps-controller-init.ts` — `__DEV__` + env-gated dynamic import.
