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

Create an ETH send confirmation from the wallet and cancel it on each
iteration:

```bash
yarn llm:mobile:memory -- --platform android --flow wallet-send-eth-cancel --iterations 10
```

Submit an ETH send transaction from the wallet on each iteration:

```bash
yarn llm:mobile:memory -- --platform android --flow wallet-send-eth-submit --send-amount 0.001 --recipient-address 0x0000000000000000000000000000000000000001 --allow-transaction-submit
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

## Wallet Confirmation Flows

The `wallet-send-eth-cancel` and `wallet-send-eth-submit` flows drive the
installed app through Appium. They assume the wallet is already onboarded,
unlocked, and on or navigable back to the Wallet screen. The CLI starts a local
Appium server on `http://127.0.0.1:4723/` by default; use `--reuse-appium` when
connecting to a server you started yourself, and `--appium-url` to point at a
custom WebDriver endpoint.

The default send amount is `25%`, which uses the send screen percentage button
and avoids depending on the current fiat/native amount mode. You can also pass
`--send-amount 0.001`, `50%`, `75%`, `100%`, or `max`.

`wallet-send-eth-cancel` opens the confirmation screen and taps the confirmation
footer Cancel button, so it is the safer repeatable leak loop. The submit flow
can broadcast a real transaction and requires `--allow-transaction-submit`.

## Notes

- Build and install the app before running this command. The CLI launches or
  relaunches an already-installed package; it does not build the app.
- Android defaults to `io.metamask` and `io.metamask.MainActivity`.
- iOS defaults to bundle id `io.metamask.MetaMask`, device `booted`, and process
  name `MetaMask`.
- Use `--help` for the full option list.
