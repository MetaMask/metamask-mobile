# Mobile Memory Leak Profiler

`yarn llm:mobile:memory` is a repeatable memory profiling entrypoint for
MetaMask Mobile. It adapts the extension memory-profiler report shape to mobile
process telemetry:

- Android: samples `adb shell dumpsys meminfo <package>` and records RSS, PSS,
  Java heap PSS, native heap PSS, graphics, code, stack, system, and swap PSS.
- iOS simulator: samples `xcrun simctl spawn <device> ps` and records RSS and
  virtual size for the app process.
- Hermes CPU profiles: optionally invokes the existing
  `react-native-release-profiler` CLI to pull or convert `.cpuprofile` files
  into the same artifact directory.

Reports are written to `test-artifacts/mobile-memory` by default.

## Examples

Android relaunch leak check:

```bash
yarn llm:mobile:memory -- --platform android --iterations 25 --max-pss-growth 40MiB
```

iOS simulator relaunch leak check:

```bash
yarn llm:mobile:memory -- --platform ios --device booted --iterations 25 --max-rss-growth 80MiB
```

Idle sampling against an already-running app:

```bash
yarn llm:mobile:memory -- --platform android --no-launch --flow idle --iterations 50 --interval 1000
```

Pull the latest Android `.cpuprofile` from Downloads and convert it with
`react-native-release-profiler` after memory sampling:

```bash
yarn llm:mobile:memory -- --platform android --pull-hermes-profile --sourcemap-path ./sourcemaps
```

Convert a local iOS-exported `.cpuprofile` into the artifact directory:

```bash
yarn llm:mobile:memory -- --platform ios --hermes-profile /path/to/profile.cpuprofile
```

## Profiler Overlay

The in-app `react-native-release-profiler` overlay is enabled for `rc` and
`exp` builds. Profiling automation can also enable it on launch with:

```bash
yarn llm:mobile:memory -- --enable-in-app-profiler
```

That passes `enableProfiler=true` through mobile launch arguments when the CLI
starts the app.

## Notes

- Build and install the app before running this command. The CLI launches or
  relaunches an already-installed package; it does not build the app.
- Android defaults to `io.metamask` and `io.metamask.MainActivity`.
- iOS defaults to bundle id `io.metamask.MetaMask`, device `booted`, and process
  name `MetaMask`.
- Use `--help` for the full option list.
