# Android Appium device pool

Android Appium smoke shards boot three emulators in one job (`N=3`) by default
and run three Playwright workers. iOS defaults to `N=2`; matrix shard counts,
Namespace runner sizes, and the golden snapshot prime job's one-emulator
topology are unchanged.

`run-appium-e2e-workflow.yml` / `run-appium-smoke-tests-android.yml` default
`android-device-pool-size` to `3`, so `ci.yml` does not need to override it.
Every Android smoke suite forwards that input. Fixture validation stays at one
emulator and a cold boot. Set the input to `1` (or `2`) via `workflow_dispatch`
or a caller `with:` to shrink a suite or all smoke jobs.

## Golden fingerprint strategy

The prime job and all Android Appium shard jobs use the same 4-core, 10240 MB,
1440x3120 emulator shape. The fingerprint already hashes the complete prime
argument list, including cores, memory, and skin. Moving from 8 cores / 12288 MB
to 4 cores / 10240 MB intentionally invalidates the golden cache once so N=2
fits a 16 vCPU / 32 GB runner; prime and shard workflows then agree on the
replacement cache key. N=3 uses the same per-emulator shape (12 cores reserved
for emulators alone) — watch RAM/CPU and preemptions if runners stay at 16×32.

Each pooled emulator resumes `e2e_golden` with `-read-only`. Console ports are
fixed so adb serials and Appium auxiliary ports never overlap:

- Worker 0: `-port 5554`, `emulator-5554`, `systemPort=8200`,
  `chromedriverPort=9100`, `mjpegServerPort=7810`, Chrome CDP `9222`,
  WebView CDP `9223`, adb server `5037`
- Worker 1: `-port 5556`, `emulator-5556`, `systemPort=8201`,
  `chromedriverPort=9101`, `mjpegServerPort=7811`, Chrome CDP `9232`,
  WebView CDP `9233`, adb server `5038`
- Worker 2: `-port 5558`, `emulator-5558`, `systemPort=8202`,
  `chromedriverPort=9102`, `mjpegServerPort=7812`, Chrome CDP `9242`,
  WebView CDP `9243`, adb server `5039`

Local test-dapp servers keep the **device** URL (`localhost:8093` and similar)
and listen on a worker-offset **host** port (`8093` / `8193` / `8293`). `adb reverse`
maps the device port to that host port. Snaps smokes load GitHub Pages, not a
local dapp; they still need per-worker WebView CDP forwards or `#installedSnapsResult`
reads hit a sibling emulator.

Workers pin those serials from `ANDROID_DEVICE_POOL_SIZE` (Playwright
`globalSetup` cannot export `ANDROID_DEVICE_POOL` into worker processes).
`ANDROID_DEVICE_POOL` remains a local override for `SKIP_DEVICE_BOOT`.
Pool mode fails during global setup unless `E2E_WORKERS` matches
`ANDROID_DEVICE_POOL_SIZE`; Playwright reads its worker count before device
boot, so global setup cannot repair a mismatch.

The `deviceProvider` worker fixture exports `E2E_WORKER_INDEX` and
`ANDROID_SERIAL`, but Playwright creates worker fixtures lazily, so a
`beforeAll` that only starts a dapp server runs first. Port and serial helpers
therefore fall back to Playwright's own `TEST_PARALLEL_INDEX` and to the pool
assignment for that index. Without the fallback both workers pick worker 0's
host port (`EADDRINUSE`) and run bare `adb reverse` against two emulators.

Framework logs include `[w0]` / `[w1]` / `[w2]` (and the adb serial once it is known)
so CI output from pooled workers can be told apart. Global setup has no
worker index and omits the tag.

## Local cold pool

There is no golden snapshot on a laptop. Set `ANDROID_EMULATOR_BOOT_MODE=cold`
(or leave `auto` with no `e2e_golden`) plus:

```bash
ANDROID_DEVICE_POOL_SIZE=3 \
E2E_WORKERS=3 \
ANDROID_EMULATOR_BOOT_MODE=cold \
ANDROID_AVD_NAME=Pixel_5_Pro_API_34 \
ANDROID_APK_PATH=build/ci-main-e2e/app-prod-release.apk \
yarn appium-smoke:android --grep SmokeAccounts
```

`E2E_WORKERS` must be set before Playwright loads config. Pooled emulators
cold-boot the same AVD with `-read-only` and `-port 5554` / `5556` / `5558`. Cold pool
boots are sequential: only the first process wipes the shared AVD before the
second read-only instance starts. Apple Silicon needs an arm64 main-e2e APK;
CI x86_64 APKs will not install.

Use the Node version in `.nvmrc`. On Node 26 every Appium session dies with
`UND_ERR_INVALID_ARG` on `POST /session`, because `webdriver` hands global
`fetch` a userland `undici` `Agent` as its `dispatcher` and Node 26's built-in
fetch rejects it (`invalid onError method`). This is unrelated to pooling; it
breaks single-emulator runs too.

## CI logs

Expected logs include:

1. Golden AVD cache restore and validation.
2. `Android device pool size=3 workers=3`.
3. Three `resumed from golden snapshot` messages (or `cold-booted for pool` if
   the cache missed).
4. `Installing io.appium.settings` (or skip when the helper is already on the
   snapshot) on each serial.
5. `Android emulator pool ready in <milliseconds>`.
6. `Android pool worker 0` / `worker 1` / `worker 2` with distinct serials and systemPorts.

The APK is installed concurrently on both serials before workers start.

Sessions keep `appium:skipDeviceInitialization` for fast Appium startup, so
`io.appium.settings` is not installed by the driver. Global setup installs that
helper (and grants `PROJECT_MEDIA`) so `mobile: startMediaProjectionRecording`
does not fall back to a long-lived `adb shell screenrecord`. Prime also bakes
the helper into `e2e_golden`; existing snapshots still get the install on
resume until the next prime.

Each Android smoke job also writes a **Android device pool** block to the
GitHub job summary with pool size, boot mode, Playwright outcome, and
`stats.duration` from the Playwright JSON report.

## Failure behavior

An incomplete pool during global setup fails the job. After setup, a missing
device fails only its assigned Playwright worker; the provider does not kill
or restart the sibling emulator. Appium retries use `parallelIndex`, so a
replacement worker keeps the same serial and ports.

## Per-worker adb servers

Each worker gets its own host `adb` server (`5037` + worker index), started and
verified during global setup. A single shared server was a job-wide single point
of failure: uncoordinated adb traffic from the framework, Appium, and screen
recording could protocol-fault the daemon, and the restart wiped every `adb
forward` mapping, so one worker's fault surfaced as `instrumentation process is
not running` on all emulators.

Two mechanisms carry the port:

- `applyAndroidDevicePoolToWorker` exports `ANDROID_ADB_SERVER_PORT`. `adb`
  reads it natively, so every adb client the worker spawns inherits it and no
  call site needs a `-P` flag.
- `resolveWorkerAdbServerPort` covers the window before that export exists.
  The `deviceProvider` fixture is lazy, so a `beforeAll` doing `adb reverse`
  runs first; without the fallback it would carry the right `-s` serial to the
  default 5037 server and put the worker straight back on worker 0's daemon.
  `adbDeviceArgs()` therefore emits `-P <port> -s <serial>`, matching the
  `TEST_PARALLEL_INDEX` fallback the serial and host ports already use.
- `EmulatorConfigBuilder` sets `appium:adbPort`. Appium is a separate process
  serving all sessions, so only a per-session capability can point its internal
  adb calls at the right server.

Every adb server still sees every emulator — adb always scans upward from port
5555, so the range cannot be partitioned. That is fine: workers select their
device with `-s`, and a fault only drops the transports and forwards owned by
that one server.

`withFixtures` still skips `adb reverse --remove` when
`ANDROID_DEVICE_POOL_SIZE >= 2`. New tests overwrite the mappings they need via
`adb reverse tcp:<fallback> tcp:<actual>`.

## Measuring impact

Do not reduce shard counts until this data exists for the suites that matter.

For each Android smoke job on the PR vs the same job on `main` (historical N=1):

1. Job wall clock (Actions UI) and Playwright `duration_ms` in the job
   summary.
2. `Android emulator pool ready in <milliseconds>` — golden resume vs cold.
3. Namespace peak CPU and RAM. Three 4-core / 10240 MB guests stress a
   16 vCPU / 32 GB profile more than N=2 did.
4. Flake rate and retries vs `main`.

N=3 is not 3× throughput: workers share one runner, so overlap is
partial. Expect **wall-clock improvement** on each shard as independent
specs run in parallel. CI critical path is still `prime + max(shard)`.
Use those numbers before collapsing any `total_splits` matrix.
