# Perf sessions (POC)

Find performance problems while product managers use **RC builds** normally, without asking them to do anything beyond installing the build.

There are two modes:

| | **Always-on** (default) | **Lab agent** |
| --- | --- | --- |
| What PMs do | Install the `main-rc-perf` build and use it | Keep the phone on a laptop running `agent.mjs` |
| How it measures | In-app sampler (`PerfSession.kt`) | [Flashlight](https://github.com/bamlab/flashlight) over adb |
| Screen names | Automatic (React Navigation) | Typed by the tester |
| Data reaches you | HTTP, live, to `collector.mjs` | A JSON file they send you |
| Survives app kills, offline | Yes (on-disk queue) | Re-attaches while the laptop runs |

Both produce the same report: screens ranked worst-first, **shared hotspots** (slow for at least half of the devices that used them), a per-device table, and freeze/jank events.

## Always-on mode

### What's measured

Every 500 ms while MetaMask is in the foreground, tagged with the focused screen:

- **FPS and janky frames** from Android FrameMetrics (a frame is janky when it misses its deadline; frozen when it takes over 700 ms). FPS is only computed while frames are being drawn, so idle screens don't count as slow.
- **CPU per thread** from `/proc/self/task` (the same data Flashlight reads): JS thread (`mqt_v_js`), `UI Thread`, `RenderThread` and the busiest others.
- **RAM** (RSS) from `/proc/self/statm`.

Batches of 20 samples (about 10 s) are written to app storage and POSTed to the collector. They are also flushed whenever the app goes to the background, because it may be killed there. If the upload fails, the batch stays queued and is retried on the next flush or launch. Sampling starts in `MainApplication.onCreate`, so cold starts are covered.

Only perf data, the screen name, device model, OS version and app version are sent: no addresses, balances or route params. Each install gets a random `deviceId`.

Code: `android/app/src/main/java/io/metamask/nativeModules/PerfSession/`, `app/core/Performance/perfSession.ts`, wired in `NavigationProvider.tsx`. It is compiled in but inert unless the build has `MM_PERF_SESSION_URL` (only `main-rc-perf` in `builds.yml`). Android only for now.

### Your setup (once)

1. **Start the collector** on your machine:
   ```bash
   cd scripts/perf-sessions
   PERF_COLLECTOR_TOKEN=$(openssl rand -hex 24) npm run collector   # keep the token
   ```
   Open http://localhost:4040 for the live dashboard.
2. **Expose it with a stable HTTPS URL.** The URL is baked into the build, so it must not change between runs. For example an ngrok static domain (`ngrok http --url=<your-domain>.ngrok-free.app 4040`) or a Cloudflare named tunnel. `npx localtunnel --port 4040 --subdomain <name>` works without an account, but the subdomain isn't guaranteed.
3. **Add two secrets** to the `build-rc` GitHub environment: `MM_PERF_SESSION_URL` (the tunnel URL) and `MM_PERF_SESSION_TOKEN` (the token from step 1).
4. **Build** `main-rc-perf` for Android: Actions → Build → `build_name: main-rc-perf`, `platform: android`. Then share the APK through the usual internal distribution.

### What PMs do

Install the `main-rc-perf` APK and use it. That's all: killing, reopening, backgrounding and losing network are handled. (It uses the `io.metamask` package, so uninstall the Play Store MetaMask first.)

### What you get

- **Live dashboard** at `/`: devices online, the screen each one is on right now, current FPS / JS CPU / RAM, shared hotspots, screens worst-first, and recent freezes. Window: 1 h to 7 days.
- `/report.md` and `/api/report.json`: the same report to share, or to hand to a bot or LLM.
- `/api/devices/<id>/flashlight.json`: one device as a Flashlight result (`npx @perf-profiler/web-reporter report <file>`).
- Name devices by adding `collector-data/testers.json`, for example `{ "<deviceId>": "Ana" }`. Device IDs are on the dashboard.

Data is stored in `collector-data/<deviceId>.ndjson` and reloaded on restart. While your machine or tunnel is off, devices keep queueing (up to about 80 minutes of foreground use) and catch up when it's back.

Try it without a build:

```bash
PERF_COLLECTOR_TOKEN=dev npm run collector
node fixtures/simulate-devices.mjs http://localhost:4040 dev   # 4 fake devices, with app kills
```

## Lab agent (Flashlight over adb)

For a deeper session on one device without a special build. It works with any installed build.

1. Install `adb` (`brew install android-platform-tools`) and Node ≥ 20, enable USB debugging on the phone, plug it in, and run `npm install` here.
2. `node agent.mjs --tester ana --session 2026-10-30-bugbash`
   - `swap` + Enter: label what you're testing from now on
   - Enter: flag a jank moment; `! note`: flag with a note
   - `q` or Ctrl+C: stop and save to `perf-sessions-output/<session>/<tester>-<time>.json`
3. `npx @perf-profiler/web-reporter report <file>.json` opens Flashlight's charts. `node aggregate.mjs <folder>` merges several testers (`npm run demo` for sample data).

Release builds strip `console.*` (`babel.config.js`), which is why this mode can't see screen names on its own.

## Known limits

- The tunnel URL is baked in at build time; changing it means rebuilding. A deployed collector would remove this.
- The token ships inside the APK. It stops casual noise, not a determined sender; fine for internal builds only.
- iOS isn't covered (FrameMetrics and `/proc` are Android-specific).
- The collector keeps everything in memory, which is fine for a handful of devices over days, not for hundreds.
