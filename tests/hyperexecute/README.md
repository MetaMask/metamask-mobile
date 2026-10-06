# TestMu AI HyperExecute performance lane

Android performance specs run on TestMu real devices through HyperExecute, in parallel with the existing BrowserStack lane.

BrowserStack stays the scheduled provider. HyperExecute runs only when `enable_testmu_hyperexecute` is true on the manual performance workflow (or passed into `run-performance-e2e.yml`).

## What runs

- Same `@Performance` specs as BrowserStack (`tests/performance/login` and `tests/performance/onboarding`)
- Same Android device matrix entry (`Google Pixel 8 Pro` / `14.0`), mapped to the TestMu catalog name `Pixel 8 Pro` / `14`
- Same with-SRP and without-SRP APKs that were just uploaded to BrowserStack
- One HyperExecute job per build type (onboarding, imported wallet), autosplit across specs

## Secrets

The workflow reads `LT_USERNAME` and `LT_ACCESS_KEY` from GitHub Actions secrets. It does not put the access key in job outputs. When either secret is missing, the TestMu jobs are skipped and BrowserStack still runs.

## Compare results

Artifact names are prefixed with `testmu-he-`. The aggregator labels those devices `Google Pixel 8 Pro (TestMu HE)` so they do not overwrite the BrowserStack `Google Pixel 8 Pro` results.

Network log capture stays off on both providers so the timers measure the same class of session.
