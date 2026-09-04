# iOS Appium device pool

iOS Appium smoke can run two Playwright workers on two cloned simulators (`N=2`).
`ci.yml` sets `ios-device-pool-size: 2` on the `appium-smoke-tests-ios` job (mirroring
Android's `android-device-pool-size: 2`), so every iOS smoke suite runs `N=2`.
`run-appium-smoke-tests-ios.yml` forwards the input to each suite; callers that omit it
default to `1`. `total_splits` is unchanged for all suites.

## Why iOS differs from Android

Android pools derive adb serials (`emulator-5554`, `emulator-5556`) and resume a
golden AVD with `-read-only`. iOS CoreSimulator UDIDs are opaque UUIDs from
`simctl clone` — they cannot be synthesized from pool size. Workers need an
explicit ordered `IOS_DEVICE_POOL`; `IOS_DEVICE_POOL_SIZE=2` alone fails closed.

There is no iOS golden / `-read-only` path. `webkitDebugProxyPort` is obsolete
in Appium XCUITest 12.x; pool mode uses per-worker `wdaLocalPort` /
`mjpegServerPort` only.

## Prepare outputs (CI and local)

`prepare-ios-appium-runner.mjs` appends lowercase keys to `GITHUB_OUTPUT`:

| Output key             | Playwright env (workflow maps) | When                              |
| ---------------------- | ------------------------------ | --------------------------------- |
| `ios-simulator-udid`   | `IOS_SIMULATOR_UDID`           | always (worker 0 / primary sim)   |
| `ios-device-pool`      | `IOS_DEVICE_POOL`              | `IOS_DEVICE_POOL_SIZE > 1` only   |
| `ios-wda-preinstalled` | `IOS_WDA_PREINSTALLED`         | always                            |
| `ios-wda-bundle-id`    | `IOS_WDA_BUNDLE_ID`            | when WDA simctl install succeeded |

Locally, point `GITHUB_OUTPUT` at a temp file and read the same keys after
prepare — do not guess UDIDs from `simctl list booted`.

**N=1:** boot `IOS_SIMULATOR_NAME` (default `iPhone 16 Pro`), install WDA + app,
warm WDA on default port 8100. No `ios-device-pool` line. Playwright omits
`appium:wdaLocalPort` / `appium:mjpegServerPort`.

**N>1:** shutdown base if booted → delete clones named
`${IOS_SIMULATOR_NAME} Appium Pool ${i}` (shutdown-before-delete if a stale
clone is still Booted; delete failures fail closed) → clone → parallel boot →
WDA prebuild once → per-UDID WDA + app install (parallel across UDIDs) → warm
WDA sequentially on the shared Appium server with ports `8100+i` / `9100+i`.
Pool mode fails closed on missing WDA artifacts, failed simctl install, or
warm-up failure (N=1 may fall back to xcodebuild). Playwright also fails closed
if `IOS_WDA_PREINSTALLED` is not `true`, so workers cannot race concurrent
xcodebuild against the shared `derivedDataPath`.

| Worker | UDID                        | `wdaLocalPort` | `mjpegServerPort` |
| ------ | --------------------------- | -------------: | ----------------: |
| 0      | first in `IOS_DEVICE_POOL`  |           8100 |              9100 |
| 1      | second in `IOS_DEVICE_POOL` |           8101 |              9101 |

## Env contract

`IOS_DEVICE_POOL_SIZE`, `E2E_WORKERS`, and `IOS_DEVICE_POOL` must agree when
either size or workers is >1 (`E2E_WORKERS` before Playwright loads config).
Malformed, duplicate, or short UDID lists throw. On N=1, a populated
`IOS_DEVICE_POOL` alone does not enable pool mode.

Workers pin via `applyIosDevicePoolToWorker(parallelIndex)`; retries keep the
same UDID/ports. The fixture restores `IOS_SIMULATOR_UDID`, `E2E_WORKER_INDEX`,
`IOS_WDA_LOCAL_PORT`, `IOS_MJPEG_SERVER_PORT` on teardown.
`appium:shutdownOtherSimulators` stays unset.

## Local recipes

Shared preamble — reads prepare outputs from a temp `GITHUB_OUTPUT` file:

```bash
export IOS_SIMULATOR_NAME="${IOS_SIMULATOR_NAME:-iPhone 16 Pro}"
export IOS_APP_PATH=build/ci-main-e2e/MetaMask.app
GITHUB_OUTPUT="$(mktemp)"
trap 'rm -f "$GITHUB_OUTPUT"' EXIT

read_prepare() { grep "^$1=" "$GITHUB_OUTPUT" | cut -d= -f2-; }
```

### N=1

```bash
IOS_APP_PATH="$IOS_APP_PATH" \
IOS_SIMULATOR_NAME="$IOS_SIMULATOR_NAME" \
GITHUB_OUTPUT="$GITHUB_OUTPUT" \
node scripts/e2e/prepare-ios-appium-runner.mjs

export IOS_SIMULATOR_UDID="$(read_prepare ios-simulator-udid)"
export IOS_WDA_PREINSTALLED="$(read_prepare ios-wda-preinstalled)"
export IOS_WDA_BUNDLE_ID="$(read_prepare ios-wda-bundle-id)"

IOS_APP_PATH="$IOS_APP_PATH" \
IOS_SIMULATOR_UDID="$IOS_SIMULATOR_UDID" \
IOS_WDA_PREINSTALLED="$IOS_WDA_PREINSTALLED" \
IOS_WDA_BUNDLE_ID="$IOS_WDA_BUNDLE_ID" \
USE_PREBUILT_WDA=true \
SKIP_DEVICE_BOOT=true \
SKIP_APP_REINSTALL=true \
yarn appium-smoke:ios
```

### N=2 (SmokeAccounts)

```bash
IOS_APP_PATH="$IOS_APP_PATH" \
IOS_SIMULATOR_NAME="$IOS_SIMULATOR_NAME" \
IOS_DEVICE_POOL_SIZE=2 \
GITHUB_OUTPUT="$GITHUB_OUTPUT" \
node scripts/e2e/prepare-ios-appium-runner.mjs

export IOS_SIMULATOR_UDID="$(read_prepare ios-simulator-udid)"
export IOS_DEVICE_POOL="$(read_prepare ios-device-pool)"
export IOS_WDA_PREINSTALLED="$(read_prepare ios-wda-preinstalled)"
export IOS_WDA_BUNDLE_ID="$(read_prepare ios-wda-bundle-id)"

E2E_WORKERS=2 \
IOS_DEVICE_POOL_SIZE=2 \
IOS_APP_PATH="$IOS_APP_PATH" \
IOS_SIMULATOR_UDID="$IOS_SIMULATOR_UDID" \
IOS_DEVICE_POOL="$IOS_DEVICE_POOL" \
IOS_WDA_PREINSTALLED="$IOS_WDA_PREINSTALLED" \
IOS_WDA_BUNDLE_ID="$IOS_WDA_BUNDLE_ID" \
USE_PREBUILT_WDA=true \
SKIP_DEVICE_BOOT=true \
SKIP_APP_REINSTALL=true \
yarn appium-smoke:ios --grep SmokeAccounts
```

Optional: `IOS_DEVICE_POOL_SIZE=2 IOS_DEVICE_POOL="$IOS_DEVICE_POOL" yarn tsx scripts/e2e/verify-appium-runner-connectivity.mjs ios`

Use the Node version in `.nvmrc`.

## CI

Logs: `iOS device pool size=2 workers=2`, `iOS pool worker 0/1` with UDID and
`wdaLocalPort`, `IOS_WDA_PREINSTALLED=true`. Job summary block **iOS device
pool** records pool size/workers, Playwright outcome, and `duration_ms` from
`playwright-report.json` (`stats.duration`).

Namespace profile `namespace-profile-metamask-ios-e2e` is **6 CPU × 14 GB** (observed 2026-09-03);
two sims + two WDAs risk RAM pressure and ~15m preemptions. Compare pooled
SmokeAccounts shards to `main` N=1 on wall clock, `duration_ms`, prepare time,
peak CPU/RAM, and flakes before expanding suites or reducing `total_splits`.
N=2 is partial overlap on one runner — not 2× throughput.

| Failure                                      | Behavior                                                           |
| -------------------------------------------- | ------------------------------------------------------------------ |
| Pool / workers mismatch                      | Throw in global setup                                              |
| Missing `IOS_WDA_PREINSTALLED` when size >1  | Throw in global setup                                              |
| Empty / short `IOS_DEVICE_POOL` when size >1 | Throw in `deviceForWorker`                                         |
| Prepare clone / WDA / warm-up                | Non-zero exit; job fails                                           |
| Sim dies mid-run                             | That worker fails; sibling untouched; retries keep `parallelIndex` |

## Related

- [Android Appium device pool](./android-appium-device-pool.md)
- [Appium smoke testing](./appium-smoke-testing.md)
