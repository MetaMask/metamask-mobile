# Android Appium device pool

Android Appium smoke shards can boot two emulators in one job (`N=2`) and run
two Playwright workers. iOS, matrix shard counts, Namespace runner sizes, and
the golden snapshot prime job's one-emulator topology are unchanged.

`ci.yml` sets `android-device-pool-size: 2` on the Android smoke workflow. Every
Android smoke suite forwards that input. Fixture validation stays at one
emulator and a cold boot. Set the input to `1` (workflow_dispatch or a ci.yml
change) to revert a suite or all smoke jobs to the historical path.

## Golden fingerprint strategy

The prime job and all Android Appium shard jobs use the same 4-core, 10240 MB,
1440x3120 emulator shape. The fingerprint already hashes the complete prime
argument list, including cores, memory, and skin. Moving from 8 cores / 12288 MB
to 4 cores / 10240 MB intentionally invalidates the golden cache once so N=2
fits a 16 vCPU / 32 GB runner; prime and shard workflows then agree on the
replacement cache key.

Each pooled emulator resumes `e2e_golden` with `-read-only`. Console ports are
fixed so adb serials and Appium auxiliary ports never overlap:

- Worker 0: `-port 5554`, `emulator-5554`, `systemPort=8200`,
  `chromedriverPort=9100`, `mjpegServerPort=7810`, Chrome CDP `9222`,
  WebView CDP `9223`
- Worker 1: `-port 5556`, `emulator-5556`, `systemPort=8201`,
  `chromedriverPort=9101`, `mjpegServerPort=7811`, Chrome CDP `9232`,
  WebView CDP `9233`

Local test-dapp servers keep the **device** URL (`localhost:8093` and similar)
and listen on a worker-offset **host** port (`8093` / `8193`). `adb reverse`
maps the device port to that host port. Snaps smokes load GitHub Pages, not a
local dapp; they still need per-worker WebView CDP forwards or `#installedSnapsResult`
reads hit the sibling emulator.

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

Framework logs include `[w0]` / `[w1]` (and the adb serial once it is known)
so CI output from the two workers can be told apart. Global setup has no
worker index and omits the tag.

## Local cold pool

There is no golden snapshot on a laptop. Set `ANDROID_EMULATOR_BOOT_MODE=cold`
(or leave `auto` with no `e2e_golden`) plus:

```bash
ANDROID_DEVICE_POOL_SIZE=2 \
E2E_WORKERS=2 \
ANDROID_EMULATOR_BOOT_MODE=cold \
ANDROID_AVD_NAME=Pixel_5_Pro_API_34 \
ANDROID_APK_PATH=build/ci-main-e2e/app-prod-release.apk \
yarn appium-smoke:android --grep SmokeAccounts
```

`E2E_WORKERS` must be set before Playwright loads config. Both emulators
cold-boot the same AVD with `-read-only` and `-port 5554` / `5556`. Cold pool
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
2. `Android device pool size=2 workers=2`.
3. Two `resumed from golden snapshot` messages (or `cold-booted for pool` if
   the cache missed).
4. `Android emulator pool ready in <milliseconds>`.
5. `Android pool worker 0` / `worker 1` with distinct serials and systemPorts.

The APK is installed concurrently on both serials before workers start.

Each Android smoke job also writes a **Android device pool** block to the
GitHub job summary with pool size, boot mode, Playwright outcome, and
`stats.duration` from the Playwright JSON report.

## Failure behavior

An incomplete pool during global setup fails the job. After setup, a missing
device fails only its assigned Playwright worker; the provider does not kill
or restart the sibling emulator. Appium retries use `parallelIndex`, so a
replacement worker keeps the same serial and ports.

## Measuring impact

Do not reduce shard counts until this data exists for the suites that matter.

For each Android smoke job on the PR vs the same job on `main` (N=1):

1. Job wall clock (Actions UI) and Playwright `duration_ms` in the job
   summary.
2. `Android emulator pool ready in <milliseconds>` — golden resume vs cold.
3. Namespace peak CPU and RAM. Two 4-core / 10240 MB guests must stay inside
   the 16 vCPU / 32 GB profile.
4. Flake rate and retries vs `main`.

N=2 is not 2× throughput: two workers share one runner, so overlap is
partial. Expect **wall-clock improvement** on each shard as independent
specs run in parallel. CI critical path is still `prime + max(shard)`.
Use those numbers before collapsing any `total_splits` matrix.
