# TestMu AI HyperExecute PoC

Branch-local PoC that keeps the existing Playwright + WebDriverIO Appium provider
(`TestMuAIProvider` → `mobile-hub.lambdatest.com`) and moves **orchestration** from
GitHub Actions `yarn playwright` to [HyperExecute](https://www.lambdatest.com/support/docs/hyperexecute-appium-testing/).

Compare against `MMQA-2042-TestMU-PoC` (direct GHA → TestMu hub).

## What runs

| Suite | Discovery | Device |
| --- | --- | --- |
| onboarding (+ seedless) | `tests/performance/onboarding/**/*.spec.ts` | BS: Pixel 7 Pro / 13 · TestMu: Pixel 7 Pro / 13 |
| imported-wallet | `tests/performance/login/**/*.spec.ts` | BS: Pixel 7 Pro / 13 · TestMu: Pixel 7 Pro / 13 |
| mm-connect | `tests/performance/mm-connect/**/*.spec.ts` | BS: Pixel 7 Pro / 13 · TestMu: Pixel 7 Pro / 13 |

MM-Connect starts the LT tunnel **inside each HyperExecute task** (not on the GHA runner).

## Key files

- `.github/workflows/performance-test-runner-testmu.yml` — thin GHA job that triggers HE
- `tests/scripts/run-testmu-hyperexecute.sh` — downloads CLI, generates YAML, runs job
- `tests/scripts/hyperexecute-discover-performance-tests.sh` — autosplit discovery
- `tests/scripts/hyperexecute-run-performance-test.sh` — per-file Playwright runner
- `.hyperexecuteignore` — excludes native build trees from upload

## Secrets handling

`run-testmu-hyperexecute.sh` does **not** embed SRPs, `E2E_PASSWORD`, `LT_ACCESS_KEY`, or
Sentry DSN in the generated YAML. Those values go to a temp `--job-secret-file` outside the
repo and are referenced as `${{.secrets.NAME}}`. GHA artifacts only upload test reports
(not `tmp/hyperexecute/`).

## Discovery vs `@Performance` grep

Autosplit discovery only emits specs whose describe title can match
`playwright.testmu.config.ts` grep `/@Performance\b/` (bare type tag). `@System`-only /
area-only specs are skipped. The per-file runner does **not** use `--pass-with-no-tests`,
so a mismatched task fails instead of reporting empty success.

## HyperExecute YAML version

Generated configs use **YAML `version: "0.2"`** (TestMu requirement) shaped like the
official [Playwright Real Device on HyperExecute](https://www.testmuai.com/support/docs/playwright-real-device-on-hyperexecute/) sample:

```yaml
version: "0.2"
runson: linux
framework:
  name: appium
  args:
    playwrightRD: true
    region: us
testDiscovery:
  type: raw
  mode: static
  command: cat tests/hyperexecute/discovered-<build-type>.txt
testRunnerCommand: bash ./tests/scripts/hyperexecute-run-performance-test.sh $test
```

Notes:

- `framework.name: appium` + `playwrightRD: true` satisfies YAML 0.2 while keeping
  AutoSplit `testDiscovery` / `testRunnerCommand` (same as the LT sample).
- Discovery is **static** (0.2 drops dynamic/matrix discovery): the CLI host
  materialises `tests/hyperexecute/discovered-*.txt` before upload.
- Tasks still run on **linux** VMs and open Appium sessions to
  `mobile-hub.lambdatest.com` via `TestMuAIProvider` (we do not use
  `runson: android` / CDP Playwright-RD).

## Provider loading

`createServiceProvider` lazy-loads BrowserStack / TestMu / emulator implementations so
HyperExecute TestMu tasks do not evaluate local emulator/Appium helper modules at import
time (that previously crashed setup and produced `Generating reports for 0 tests`).

## Manual local trigger

```bash
export LT_USERNAME=...
export LT_ACCESS_KEY=...
export TESTMU_DEVICE='Pixel 7 Pro'
export TESTMU_OS_VERSION=15
export TESTMU_ANDROID_APP_URL='lt://...'
export BUILD_TYPE=onboarding   # or imported-wallet | mm-connect
bash ./tests/scripts/run-testmu-hyperexecute.sh
```
