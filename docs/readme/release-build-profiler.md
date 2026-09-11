## Release Build Profiling with `react-native-release-profiler`

This guide covers building an RC (Release Candidate) release, recording a Hermes CPU profile in production conditions, retrieving the trace on iOS and Android, and viewing it in Chrome's tracing UI.

### 1) Build an RC release

- Create a branch off the commit you want to profile and bump the version to `7.XX.99`.
- Trigger the `Build Mobile App` GitHub Actions workflow and select an RC build.

#### iOS

- Once `deploy_ios_to_store` completes, install the RC build from TestFlight.

#### Android

- Download and install the release APK from the `build_android_main_rc` workflow (Artifacts tab).

### 2) Record a profiling session in the app

On a physical device, open the Profiler UI (shake gesture), then:

- Tap Start → reproduce the journey you want to measure → tap Stop.
- iOS: tap Export to send the file to yourself (AirDrop, Files, iCloud, etc.).
- Android: the `.cpuprofile` is written to the device's Downloads folder automatically.

Notes:

- Each session writes a unique file; previous traces are not overwritten.
- iOS ignores "save to downloads" and always writes to Caches; use Export to share it.
- Android copies to Downloads when profiling stops.

#### Performance-test APKs (programmatic profiling)

BrowserStack performance builds (`main-e2e-bs-with-srp` / `main-e2e-bs-without-srp` in `builds.yml`) set `IS_PERFORMANCE_TEST=true`. In those APKs the app profiles itself: `index.js` calls `initializeAppProfiling()`, which arms Hermes as soon as JS runs and dumps a trace every time the app is backgrounded. Outside performance APKs it is a no-op, and so are `startAppProfiling` / `stopAppProfiling` if you call them directly.

On Android this goes through `MetaMaskHermesProfiler`, a native module in
`android/app/src/main/java/io/metamask/nativeModules/HermesProfiler/` that is
only registered when `BuildConfig.IS_PERFORMANCE_TEST` is true. It runs the same
stop sequence as the shake flow above — `dumpSampledTraceToFile` then `disable`,
on the native modules thread — against the prebuilt `hermes-android` artifact
from Maven, so no React Native or Hermes patches are involved. The only
difference from the shake flow is the destination: the shake flow copies to the
shared Downloads collection through `MediaStore`. Appium can pull from Downloads
on a non-rooted device too, but app-scoped external storage
(`getExternalFilesDir(DIRECTORY_DOCUMENTS)`) gives deterministic segment names,
numbering that survives process restarts, and automatic cleanup under
`fullReset` — without a Toast — so the module writes there instead.

#### Why the app drives its own session

Nothing in the test taps in-app controls to start or stop profiling, and nothing
should. Two reasons:

- **Launch coverage.** Anything that asks the app to start profiling from the
  outside costs an Appium round trip at exactly the moment the launch-time specs
  begin their timers. Self-arming is free, so the launch those specs measure is
  actually in the trace, and a spec that restarts the app gets the new process
  profiled with no extra work.
- **Reliability.** The previous design mounted invisible `Pressable` hooks in
  the app root. Because the root draws edge-to-edge on `targetSdk` 36, the hooks
  nearest the top of the screen sat under the status bar, where Android reports
  them as not visible to the user and Appium drops them from the accessibility
  tree entirely. Roughly a fifth of start/stop lookups failed that way, and no
  timeout could fix it.

Backgrounding is the dump trigger because it is the only signal that the test
can produce on demand (`mobile: backgroundApp`, already used by the warm-start
specs) and that nothing on screen can swallow. Do **not** use deeplinks —
unknown `metamask://e2e/profiler/*` URLs show MetaMask's unsupported-link UI.

#### Every performance spec is profiled automatically

`appProfiling.fixture.ts` is an `auto` fixture, so no spec needs profiling
plumbing. Any Playwright test under `tests/performance/` is profiled from app
startup; after the last assertion the fixture backgrounds the app, waits for the
trace to land, pulls every segment into
`tests/reporters/reports/hermes-cpuprofiles/` and attaches it to the Playwright
report. On iOS collection is skipped (app-scoped export is Android-only).

#### Segments

A Hermes session cannot outlive the process that opened it. The app therefore
dumps whenever it stays backgrounded past a short grace period (so brief pauses
like biometric prompts do not cost a multi-MB write) and immediately re-arms, and
one test can produce several traces:

- Specs that kill the app (`AppiumGestures.terminateApp`, used by the cold-start
  launch-time specs) flush first. `terminateApp` runs the `onBeforeAppTerminate`
  hooks from `tests/framework/appLifecycle.ts`, and the fixture registers one to
  harvest the in-flight trace while the process is still alive.
- Specs that background the app themselves — the warm-start specs, and the OAuth
  hand-offs in seedless onboarding — produce a segment at that point too.

`dumpSampledTraceToFile` clears the sample buffer after writing, so segments
never overlap. The app numbers segments across processes by scanning the output
directory so a restarted process cannot reuse an index the test has not pulled
yet, and renames each trace into place only once Hermes has finished writing it,
so a segment that pulls and parses is complete.

Artifacts are named `<project>-<title>.cpuprofile`, with `.retry-<n>` for
retried attempts (otherwise a retry overwrites the artifact of the attempt
before it) and `.segment-<n>` for every segment after the first.

If the app never armed itself, or died without going through `terminateApp`, no
segment appears; the fixture logs a warning and preserves the test result rather
than failing the spec.

### 3) Convert and view in Chrome tracing

Chrome's tracing UI expects a JSON trace. Convert the `.cpuprofile` first:

```bash
yarn react-native-release-profiler --local /path/to/profile.cpuprofile
```

To have sourcemaps on the tracing, to be easier to identify the processes that are happening, convirt the `.cpuprofile` with this argument:

```bash
yarn react-native-release-profiler --local /path/to/profile.cpuprofile --sourcemap-path /path/to/sourcemaps
```

You can find the sourcemaps in the artifacts of the build that produced the APK/IPA:

- **GitHub Actions**: artifacts uploaded by the `build` workflow, under the name `android-sourcemaps-<build-name>` (Android) or `ios-sourcemaps-<build-name>` (iOS). Download and unzip the artifact.

Then open Chrome and load the generated JSON:

- Navigate to `chrome://tracing` → Load → select the JSON file.

Other viewers:

- SpeedScope: open the `.cpuprofile` directly at https://www.speedscope.app
- Perfetto UI: open the converted JSON at https://ui.perfetto.dev

### 4) Or: let an AI coding agent read it

Instead of converting the trace and eyeballing a flame graph, you can hand the
raw `.cpuprofile` to **Claude Code / your AI agent of choice** and ask "why is
this slow?" — it parses the Hermes sampling profile and points you at the hot
frames / culprit function directly, no viewer needed. Often the fastest path to
a root cause.
