# TestMu AI HyperExecute performance lane

Android performance specs run on TestMu real devices through HyperExecute.

Pull requests run performance tests on TestMu only. The same CI job still builds the with-SRP and without-SRP APKs, uploads them to TestMu, and posts the aggregated report, session recordings, and PR comment from those TestMu artifacts. Scheduled runs stay on BrowserStack. A manual run can set `enable_testmu_hyperexecute` to add a TestMu lane next to BrowserStack.

## What runs

- Same `@Performance` specs as BrowserStack (`tests/performance/login` and `tests/performance/onboarding`)
- Same Android device matrix entry (`Google Pixel 8 Pro` / `14.0`), mapped to the TestMu catalog name `Pixel 8 Pro` / `14`
- Same with-SRP and without-SRP APKs the performance workflow stages for the run
- One HyperExecute job per build type (onboarding, imported wallet), autosplit across specs

## Secrets

The workflow reads `LT_USERNAME` and `LT_ACCESS_KEY` from GitHub Actions secrets. It does not put the access key in job outputs. A pull request fails the credential job when either secret is missing. A manual TestMu lane is skipped instead, and BrowserStack still runs.

## Compare results

Artifact names are prefixed with `testmu-he-`. The aggregator labels those devices `Google Pixel 8 Pro (TestMu HE)` so they do not overwrite the BrowserStack `Google Pixel 8 Pro` results.

Network log capture stays off on both providers so the timers measure the same class of session.
