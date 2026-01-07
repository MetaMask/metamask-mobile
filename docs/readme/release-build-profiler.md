## Release Build Profiling with `react-native-release-profiler`

This guide covers building an RC (Release Candidate) release, recording a Hermes CPU profile in production conditions, retrieving the trace on iOS and Android, and viewing it in Chrome's tracing UI.

### 1) Build an RC release

- Create a branch off the commit you want to profile and bump the version to `7.XX.99`.
- In Bitrise, trigger `release_rc_builds_to_store_pipeline` for that branch.

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

### 3) Convert and view in Chrome tracing

Chrome's tracing UI expects a JSON trace. Convert the `.cpuprofile` first:

```bash
yarn react-native-release-profiler --local /path/to/profile.cpuprofile
```

To have sourcemaps on the tracing, to be easier to identify the processes that are happening, convirt the `.cpuprofile` with this argument:

```bash
yarn react-native-release-profiler --local /path/to/profile.cpuprofile --sourcemap-path /path/to/sourcemaps
```

You can find the sourcemaps at the artifcacts generated when running `release_rc_builds_to_store_pipeline` in bitrise, under the name `Android_Sourcemaps_prodRelease.zip`, download and unzip it.

Then open Chrome and load the generated JSON:

- Navigate to `chrome://tracing` → Load → select the JSON file.

Other viewers:

- SpeedScope: open the `.cpuprofile` directly at https://www.speedscope.app
- Perfetto UI: open the converted JSON at https://ui.perfetto.dev
