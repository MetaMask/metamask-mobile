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

BrowserStack performance builds (`main-e2e-bs-with-srp` / `main-e2e-bs-without-srp` in `builds.yml`) set `IS_PERFORMANCE_TEST=true`. Those APKs include:

```ts
import { startAppProfiling, stopAppProfiling } from 'app/core/Performance';

await startAppProfiling();
// ... flow to measure ...
const path = await stopAppProfiling();
```

Outside performance APKs these functions no-op.

On Android they go through `MetaMaskHermesProfiler`, a native module in
`android/app/src/main/java/io/metamask/nativeModules/HermesProfiler/` that is
only registered when `BuildConfig.IS_PERFORMANCE_TEST` is true. It runs the same
stop sequence as the shake flow above — `dumpSampledTraceToFile` then `disable`,
on the native modules thread — against the prebuilt `hermes-android` artifact
from Maven, so no React Native or Hermes patches are involved. The only
difference from the shake flow is the destination: the shake flow copies to the
shared Downloads collection through `MediaStore`, which Appium cannot read back
on a non-rooted device, so the module writes to app-scoped external storage
(`getExternalFilesDir(DIRECTORY_DOCUMENTS)`) instead.

`PerformanceProfilerStatus` mounts Appium Pressables
(`performance-profiler-start` / `performance-profiler-stop`) and exposes the path
via `performance-profiler-result-ready` so tests can wait and `pullFile`. Do
**not** use deeplinks — unknown `metamask://e2e/profiler/*` URLs show MetaMask's
unsupported-link UI.

#### Every performance spec is profiled automatically

`appProfiling.fixture.ts` is an `auto` fixture, so no spec needs profiling
plumbing. Any Playwright test under `tests/performance/` gets a session started
before its body (covering login) and stopped after its last assertion. On
Android the fixture then pulls the profile into
`tests/reporters/reports/hermes-cpuprofiles/` and attaches it to the Playwright
report; on iOS it stops profiling only (pull not implemented).

#### One session per app process

A Hermes profiling session cannot outlive the process that opened it. This is
not a limitation we work around — asking Hermes to dump a sampler that is no
longer running is what makes the native stop call hang.

BrowserStack satisfies this by default: `fullReset: true` plus disabled session
reuse means each performance spec runs against a freshly installed app.

Specs that deliberately kill the app mid-test (`AppiumGestures.terminateApp`,
used by the cold-start launch-time specs) still get a profile. `terminateApp`
runs the `onBeforeAppTerminate` hooks from `tests/framework/appLifecycle.ts`, and
the profiling fixture uses one to flush the in-flight trace while the process is
still alive. The fixture's end-of-test stop then has nothing left to do.

Profiling is deliberately **not** re-armed after the relaunch. Tapping the
in-app start control costs an Appium round trip, and the launch-time specs start
measuring immediately after `activateApp`, so re-arming there would inflate the
very timer they exist to record. Those specs therefore produce a trace of the
work leading up to the restart rather than of the restart itself.

A test that profiles more than one process produces one artifact per segment:
the first keeps the plain `<project>-<title>.cpuprofile` name and later ones are
suffixed `.segment-<n>.cpuprofile`.

If the app dies without going through `terminateApp` (a crash, say), the stop
control publishes `performance-profiler-session-lost` and collection is skipped
for that spec instead of hanging on a dump.

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
