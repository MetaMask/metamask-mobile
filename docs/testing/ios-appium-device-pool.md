# iOS Appium device pool

iOS Appium smoke can boot two cloned simulators in one job (`N=2`) and run two
Playwright workers. Android pooling, iOS matrix `total_splits`, and suites other
than **SmokeAccounts** stay at `N=1` until pilot data justifies expansion.

Only `appium-accounts-ios-smoke` passes `ios-device-pool-size: 2` in
`.github/workflows/run-appium-smoke-tests-ios.yml`. Every other iOS smoke job
omits the input (default `1`). Shard counts (`total_splits`) are unchanged.

## Why iOS is not Android-style pooling

Android derives adb serials from fixed console ports (`emulator-5554`,
`emulator-5556`) and resumes a shared golden AVD with `-read-only`. iOS has no
equivalent: CoreSimulator UDIDs are opaque UUIDs assigned at clone time and
cannot be synthesized from pool size or worker index.

Workers therefore require an explicit ordered `IOS_DEVICE_POOL` (comma-separated
UDIDs) exported by `prepare-ios-appium-runner.mjs`. Setting only
`IOS_DEVICE_POOL_SIZE=2` without that list fails closed — the framework throws
before tests start.

There is no golden snapshot or `-read-only` resume path for iOS pool clones.
Each worker gets a fresh `simctl clone` of the base device type.

`webkitDebugProxyPort` is obsolete in Appium XCUITest 12.x and is not used.
Parallelism is handled by per-worker `wdaLocalPort` and `mjpegServerPort` only.

## N=1 vs N>1 prepare

**N=1 (legacy, unchanged):** resolve `IOS_SIMULATOR_NAME` (default `iPhone 16
Pro`), boot that simulator, prebuild/install WDA and MetaMask on it, warm WDA on
the default port. Export `ios-simulator-udid` only — no `ios-device-pool`
output. Playwright omits `appium:wdaLocalPort` and `appium:mjpegServerPort`.

**N>1:** shutdown the base simulator if booted; delete stale clones named
`<baseName> Appium Pool <i>` for each worker index; `simctl clone` the base once
per worker; boot all clones in parallel. WDA prebuild runs once (using the
first UDID as the xcodebuild destination). Each clone gets sequential WDA + app
install on that UDID (installs across different UDIDs may run concurrently).
Warm WDA per clone with worker-specific ports. Export:

- `ios-simulator-udid` — first clone UDID (compat with N=1 callers)
- `ios-device-pool` — ordered comma-separated clone UDIDs

Clone names (worker index `i`):

```text
${IOS_SIMULATOR_NAME} Appium Pool ${i}
```

Example: `iPhone 16 Pro Appium Pool 0`, `iPhone 16 Pro Appium Pool 1`.

## Port map (pool mode only)

| Worker | UDID source                 | `wdaLocalPort` | `mjpegServerPort` |
| ------ | --------------------------- | -------------- | ----------------- |
| 0      | first in `IOS_DEVICE_POOL`  | 8100           | 9100              |
| 1      | second in `IOS_DEVICE_POOL` | 8101           | 9101              |

Worker 0’s WDA port matches the historical single-simulator default (8100).
Bases are `8100 + workerIndex` and `9100 + workerIndex` in
`iosDevicePool.ts` / prepare warm-up.

## Required env relationships

| Variable               | Role                                                                        |
| ---------------------- | --------------------------------------------------------------------------- |
| `IOS_DEVICE_POOL_SIZE` | Simulator count; default `1`.                                               |
| `E2E_WORKERS`          | Playwright worker count; must be set **before** Playwright loads config.    |
| `IOS_DEVICE_POOL`      | Ordered clone UDIDs from prepare; required when `IOS_DEVICE_POOL_SIZE > 1`. |

When either pool size or workers is greater than one, all three must agree:
`IOS_DEVICE_POOL_SIZE === E2E_WORKERS`, and `IOS_DEVICE_POOL` must contain
exactly that many valid, unique UDIDs. Playwright reads worker count before
global setup, so a mismatch cannot be repaired during boot.

Fail-closed cases:

- `IOS_DEVICE_POOL_SIZE > 1` with empty or wrong-length `IOS_DEVICE_POOL`
- Duplicate or malformed UDIDs in `IOS_DEVICE_POOL`
- `IOS_DEVICE_POOL_SIZE` ≠ `E2E_WORKERS` when either is > 1

On N=1, a populated `IOS_DEVICE_POOL` alone does **not** enable pool mode —
`IOS_DEVICE_POOL_SIZE` must stay `1`.

## WDA in pool mode (fail-closed)

Pool mode requires prebuilt WDA artifacts under `~/appium-wda` and successful
`simctl` install of WebDriverAgentRunner on **every** clone. Prepare throws (job
fails) when:

- WDA artifacts are missing (`IOS_DEVICE_POOL_SIZE > 1`)
- Any simctl WDA install fails (N=1 logs a warning and falls back to xcodebuild;
  pool mode does not)
- WDA is not preinstalled on every simulator after install
- WDA warm-up fails for any clone in pool mode

N=1 warm-up failure is logged and prepare continues; the first Playwright
session may launch WDA. Pool mode has no silent xcodebuild fallback — two
workers sharing one DerivedData path would race.

CI sets `USE_PREBUILT_WDA=true`, `IOS_WDA_PREINSTALLED=true`, and
`IOS_WDA_BUNDLE_ID` from prepare outputs. The same `updatedWDABundleId` is used
on both sims (installs are per-UDID).

## Worker pinning and env cleanup

The worker-scoped `deviceProvider` fixture calls
`applyIosDevicePoolToWorker(workerInfo.parallelIndex)` before creating the
Appium provider. Playwright retries reuse `parallelIndex`, so a replacement
worker keeps the same UDID and ports.

Exported per worker: `IOS_SIMULATOR_UDID`, `E2E_WORKER_INDEX`,
`IOS_WDA_LOCAL_PORT`, `IOS_MJPEG_SERVER_PORT`. `EmulatorConfigBuilder` adds
`appium:wdaLocalPort` / `appium:mjpegServerPort` only when those env vars are
set.

On worker teardown, the fixture restores or deletes those keys so sibling
workers or later runs do not inherit stale port/UDID assignments.

`appium:shutdownOtherSimulators` stays unset so one worker cannot shut down its
sibling simulator.

## Local N=1 (unchanged)

```bash
IOS_APP_PATH=build/ci-main-e2e/MetaMask.app \
IOS_SIMULATOR_NAME="iPhone 16 Pro" \
node scripts/e2e/prepare-ios-appium-runner.mjs

export IOS_SIMULATOR_UDID=$(xcrun simctl list devices booted -j | node -e "
  const d=JSON.parse(require('fs').readFileSync(0,'utf8'));
  const booted=Object.values(d.devices).flat().find(x=>x.state==='Booted');
  console.log(booted?.udid||'');
")

IOS_APP_PATH=build/ci-main-e2e/MetaMask.app \
IOS_SIMULATOR_UDID="$IOS_SIMULATOR_UDID" \
SKIP_DEVICE_BOOT=true \
SKIP_APP_REINSTALL=true \
yarn appium-smoke:ios
```

## Local N=2

Prepare clones and prints the primary UDID. Capture the ordered pool from
simulator names or re-list clones after prepare:

```bash
IOS_APP_PATH=build/ci-main-e2e/MetaMask.app \
IOS_SIMULATOR_NAME="iPhone 16 Pro" \
IOS_DEVICE_POOL_SIZE=2 \
node scripts/e2e/prepare-ios-appium-runner.mjs

# Export ordered clone UDIDs (worker 0, then worker 1)
export IOS_DEVICE_POOL=$(node -e "
const { execSync } = require('child_process');
const names = ['iPhone 16 Pro Appium Pool 0', 'iPhone 16 Pro Appium Pool 1'];
const list = JSON.parse(execSync('xcrun simctl list devices available -j', { encoding: 'utf8' }));
const udids = names.map((name) => {
  for (const devices of Object.values(list.devices)) {
    const sim = devices.find((d) => d.name === name);
    if (sim) return sim.udid;
  }
  throw new Error('Missing clone: ' + name);
});
process.stdout.write(udids.join(','));
")

E2E_WORKERS=2 \
IOS_DEVICE_POOL_SIZE=2 \
IOS_DEVICE_POOL="$IOS_DEVICE_POOL" \
IOS_APP_PATH=build/ci-main-e2e/MetaMask.app \
SKIP_DEVICE_BOOT=true \
SKIP_APP_REINSTALL=true \
yarn appium-smoke:ios --grep SmokeAccounts
```

`E2E_WORKERS` must be exported before Playwright starts. After prepare, set
`SKIP_DEVICE_BOOT=true` and `SKIP_APP_REINSTALL=true` so workers attach to
clones that already have WDA and MetaMask installed.

Optional connectivity check:

```bash
IOS_DEVICE_POOL="$IOS_DEVICE_POOL" \
yarn tsx scripts/e2e/verify-appium-runner-connectivity.mjs ios
```

Use the Node version in `.nvmrc`.

## CI logs and job summary

Expected logs include:

1. `Preparing iOS Appium runner (sim pool → WDA prebuild)…`
2. `iOS device pool size=2 workers=2` (accounts pilot only)
3. `iOS pool worker 0` / `worker 1` with distinct UDIDs and `wdaLocalPort`
4. `IOS_WDA_PREINSTALLED=true` when pool WDA install succeeded

Each iOS smoke job writes an **iOS device pool** block to the GitHub job
summary with pool size/workers, Playwright outcome, and `duration_ms` from
`tests/test-reports/playwright-json/playwright-report.json` (`stats.duration`).

## Runner resource caveat

Namespace iOS Appium jobs use `namespace-profile-metamask-ios-e2e` (**6 CPU × 14
GB** RAM, observed 2026-09-03). Two iPhone 16 Pro simulators plus two WDAs
compete for the same host. Jobs on this profile are often preempted around ~15
minutes wall clock.

Do not opt additional suites to `N=2` or reduce `total_splits` until pilot
data exists. For SmokeAccounts iOS shards, compare each pooled job to the same
shard on `main` (`N=1`):

1. Job wall clock (Actions UI) and Playwright `duration_ms` in the job summary.
2. Prepare-step duration (clone, WDA install, warm-up).
3. Namespace peak CPU and RAM during the Playwright step.
4. Flake rate and retries vs `main`.

`N=2` is not 2× throughput: two workers share one runner, so overlap is
partial. CI critical path remains `max(shard)` across the matrix; this pilot
does not change shard count.

## Failure behavior

| Event                                          | Behavior                                                                              |
| ---------------------------------------------- | ------------------------------------------------------------------------------------- |
| Pool / workers mismatch                        | Throw in `assertIosDevicePoolMatchesWorkers` during global setup.                     |
| Empty or short `IOS_DEVICE_POOL` when size > 1 | Throw in `deviceForWorker`.                                                           |
| Prepare clone / WDA / warm-up failure          | Prepare exits non-zero; job fails.                                                    |
| Sim dies mid-run                               | That worker’s tests fail; sibling sim is not shut down. Retries keep `parallelIndex`. |

After setup, a missing device fails only its assigned Playwright worker.

## Related

- [Android Appium device pool](./android-appium-device-pool.md) — golden resume,
  derivable serials, Android-only pooling
- [Appium smoke testing](./appium-smoke-testing.md) — builds, env vars, local runs
