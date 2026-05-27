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
yarn llm:mobile:memory -- --platform android --flow wallet-send-eth-cancel --fixture default --iterations 10
```

Load a local Expo dev-client bundle before driving the wallet flow. This runs
headlessly, starts the default fixture server, passes the fixture port as a
launch arg, loads the Metro URL, and uses the app's local AgenticService CDP
bridge to prepare the fixture wallet before sampling:

```bash
METAMASK_ENVIRONMENT=e2e IS_TEST=true METAMASK_BUILD_TYPE=main EXPO_NO_TYPESCRIPT_SETUP=1 yarn expo start --port 8092
yarn llm:mobile:memory -- --platform ios --device booted --flow wallet-send-eth-cancel --fixture default --expo-dev-url "http://localhost:8092?disableOnboarding=1" --headless-wallet-setup
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

Capture Hermes heap snapshots before and after a flow, then include a shallow
heap-growth comparison in the memory report:

```bash
yarn llm:mobile:memory -- --platform ios --device booted --flow wallet-send-eth-cancel --fixture default --expo-dev-url "http://localhost:8092?disableOnboarding=1" --headless-wallet-setup --capture-heap-snapshots
```

Heap snapshots are written to `<artifact-dir>/heap-snapshots` by default. Use
`--heap-snapshot-dir` to choose a different directory, and
`--heap-snapshot-top-count` to control how many growing node groups are included
in the diff. The comparison groups nodes by heap snapshot `type:name` and ranks
them by shallow `self_size` growth; it is useful for finding retained object
classes or large strings, but it is not a dominator or retained-size analysis.

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
installed app through Appium. For repeatable local runs, pass
`--fixture default`; the CLI starts the E2E fixture server on
`--fixture-server-port` (`12345` by default), passes that port as a mobile
launch argument, and waits for the app to request `/state.json`. For fully
headless dev-client runs, add `--headless-wallet-setup`; the CLI calls the
local AgenticService CDP bridge on `--cdp-port` (inferred from
`--expo-dev-url`, otherwise `8081`) to unlock or create the fixture wallet with
`--wallet-password` (`123123123` by default). For send flows, the default
fixture is patched locally before serving so Ethereum mainnet is enabled and
the selected EVM account has a local-only ETH balance; no real funds are
created or moved by fixture setup. The fixture also points Ethereum mainnet at
the profiler fixture server's local JSON-RPC endpoint and disables transaction
simulations/smart transactions, so the confirmation can be created without
Infura, Sentinel, or Blockaid network access. The headless ETH balance seed is
also reapplied immediately before each send iteration and again after the asset
picker opens, so balance polling cannot clear the local seed before Ethereum is
selected. For the default fixture recipient, the flow first tries to select
`Account 2` from the wallet recipient list, then falls back to typing the
default external recipient address and accepting the new-address warning if the
fixture wallet only has one account. Pass `--recipient-address` to exercise a
specific typed external-address path instead. Without `--fixture`, the wallet
must already be onboarded, unlocked, funded, and on or navigable back to the
Wallet screen.

The CLI starts a local Appium server on `http://127.0.0.1:4723/` by default;
use `--reuse-appium` when connecting to a server you started yourself, and
`--appium-url` to point at a custom WebDriver endpoint.

The default send amount is `25%`, which uses the send screen percentage button
and avoids depending on the current fiat/native amount mode. You can also pass
`--send-amount 0.001`, `50%`, `75%`, `100%`, or `max`.

For local iOS dev-client builds, run Metro with `METAMASK_ENVIRONMENT=e2e` and
`IS_TEST=true`, then pass `--expo-dev-url` to load the Metro bundle headlessly
through Appium before baseline sampling. Pair it with `--headless-wallet-setup`
when the fixture loads a locked vault or the app lands on onboarding before the
wallet screen. In that mode the CLI skips waiting for the app to fetch
`/state.json`; the fixture wallet is injected through AgenticService over CDP,
and the fixture server stays available for mocked JSON-RPC.

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
