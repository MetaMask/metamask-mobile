# Perf sessions (POC)

Find performance problems while people use **internal test builds** normally, with Flashlight-style metrics (CPU per thread, FPS, RAM) and no extra steps for the tester.

There are two modes:

| | **Always-on** (default) | **Lab agent** |
| --- | --- | --- |
| What testers do | Install a `main-exp` build and use it | Keep the phone on a laptop running `agent.mjs` |
| How it measures | In-app sampler (`PerfSession.kt`) | [Flashlight](https://github.com/bamlab/flashlight) over adb |
| Screen names | Automatic (React Navigation) | Typed by the tester |
| Data reaches you | HTTPS, live, to the perf collector | A JSON file they send you |
| Survives app kills, offline | Yes (on-disk queue) | Re-attaches while the laptop runs |

## Always-on mode

### What's measured

Every second while MetaMask is in the foreground, tagged with the focused screen:

- **CPU per thread** from `/proc/self/task`, the same data Flashlight reads: JS thread (`mqt_v_js`), `UI Thread`, `RenderThread` and the busiest others. The sampler's own threads are left out and reported separately as `selfCpu`.
- **FPS and janky frames** from Android FrameMetrics (janky: missed its deadline; frozen: over 700 ms). FPS is only reported while the screen is actively rendering (at least 25% of the refresh rate). Below that the window is an idle redraw: frame counts are still sent, FPS is `null`.
- **RAM** (RSS) from `/proc/self/statm`.

Batches of 10 samples (about 10 s) are written to app storage and POSTed to the collector, and flushed whenever the app goes to the background, because it may be killed there. Failed uploads stay queued (up to 500 batches) and are retried on the next flush.

Only perf data, the screen name (static route names, never route params), device model, OS version and app version are sent. Each install gets a random `deviceId`.

### The collector is the on/off switch

The app calls `GET /status?env=<env>` at launch, on resume and every few minutes. It only records while the collector answers `{"record": true}` for its env (`main-exp`, `main-rc`, ...). When the collector is off, unreachable or says no, nothing is sampled or queued, so turning the collector off stops every installed build within minutes.

### Which builds have it

Gradle bakes `MM_PERF_SESSION_URL`, `MM_PERF_SESSION_KEY` and the env (`<METAMASK_BUILD_TYPE>-<METAMASK_ENVIRONMENT>`) into `BuildConfig`. They come from the `*perf_session` anchor in `builds.yml`, which only `main-exp` merges today. To add RC, change one line in its `env`:

```yaml
  main-rc:
    env:
      <<: [*public_envs, *perf_session]
```

`android/app/build.gradle` fails the build if the URL is set for anything other than dev, exp or rc builds, if it isn't an `https://` origin, or if the key isn't 24–128 characters of `[A-Za-z0-9_-]`. Builds without the anchor don't register the native module at all.

**The URL and key are public by design.** They are committed here and ship inside the APK. Security comes from the collector: it validates every batch strictly, rate-limits, caps storage, and only exposes the upload and status endpoints. Dashboards stay on localhost.

### The collector

The collector is a separate project, not part of this repo. It receives batches, serves the live dashboard and reports, and exports devices in Flashlight's result format (`npx @perf-profiler/web-reporter report <file>`).

Code: `android/app/src/main/java/io/metamask/nativeModules/PerfSession/`, `app/core/Performance/perfSession.ts`, wired in `NavigationProvider.tsx`. Android only for now.

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

- The collector URL is baked in at build time. Use a hostname you control so the collector can move (laptop, then a cloud host) without rebuilding.
- Anyone with the APK can send fake perf data. The collector can limit and flag it, not prevent it.
- iOS isn't covered (FrameMetrics and `/proc` are Android-specific).
