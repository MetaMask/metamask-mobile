# Perf sessions (POC)

Record Android performance with [Flashlight](https://github.com/bamlab/flashlight) while product managers test a **main-rc** build by hand, then merge every tester's recording into one report of shared low-performance patterns.

Flashlight runs on a **laptop** and reads the phone over adb (CPU per thread, RAM, FPS every 500 ms). Nothing is added to the app.

## Tester setup (once)

1. Install `adb` (`brew install android-platform-tools`) and Node ≥ 20.
2. On the phone, turn on Developer options → USB debugging, plug it in, and accept the prompt. `adb devices` should list it. Wireless also works: `adb pair` / `adb connect <ip>`.
3. Install the **main-rc** APK (`builds.yml` → `main-rc`, package `io.metamask`).
4. `cd scripts/perf-sessions && npm install`

## During the session

```bash
node agent.mjs --tester ana --session 2026-10-30-bugbash
```

| Type in the terminal | Effect                                              |
| -------------------- | --------------------------------------------------- |
| `swap` + Enter       | Label what you're testing from now on               |
| Enter                | "That felt janky": flags this moment                 |
| `! quotes stutter`   | Jank flag with a note                               |
| `q` (or Ctrl+C)      | Stop and save                                       |

App restarts and backgrounding are handled. Measuring pauses while the app isn't running. With several phones attached, add `--device <serial>`.

Each run writes `perf-sessions-output/<session>/<tester>-<time>.json`, which is a valid Flashlight result:

```bash
npx @perf-profiler/web-reporter report perf-sessions-output/<session>/<file>.json   # Flashlight's charts
```

## After the session

Collect everyone's `.json` files into one folder, then:

```bash
node aggregate.mjs perf-sessions-output/2026-10-30-bugbash
```

This writes `report.md` (flows ranked worst-first, **shared hotspots**, per-device table, jank flags with the FPS/JS CPU measured around them) and `report.json` (the same data, structured for a bot or LLM).

A flow is a **shared hotspot** when it was slow (≥20% of time under 75% of refresh rate, or JS thread locked ≥90% CPU for ≥10% of time) for at least half of the testers who used it. Problems on a single device show up in the device table instead.

Try it without a device: `npm run demo`.

## Known limits / next steps

- **Flow labels are manual.** Release builds strip `console.*` (`babel.config.js`), so the agent can't see the current screen. Next step: a tiny native log of the active route (e.g. `Log.i("MMPerfRoute", name)` from the navigation `onStateChange`, gated to RC) that the agent tails from `adb logcat`, which gives automatic per-screen attribution.
- **Uploads are manual.** Next step: the agent POSTs the result to a shared bucket/endpoint, and aggregation runs in CI or a bot after the session.
- **LLM triage.** Feed `report.json` (plus Release-profiler `.cpuprofile`s for the hotspot flows) to an LLM to summarise and suggest suspects.
- Flashlight's published `@perf-profiler/profiler` is 0.10.x; the agent detects the refresh rate itself until a newer release ships.
