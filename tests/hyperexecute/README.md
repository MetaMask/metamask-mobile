# TestMu AI HyperExecute performance lane

Android performance specs run on TestMu real devices through HyperExecute.

Pull requests, scheduled runs, and manual runs execute the performance tests on TestMu only. The same CI job builds the with-SRP and without-SRP APKs, uploads them to TestMu, and posts the aggregated report, session recordings, and PR comment from those TestMu artifacts.

The scripts that drive the lane live in `.github/scripts/qa-automation/performance-tests/`. `tests/hyperexecute/.hyperexecuteignore` keeps the upload lean; `run-testmu-hyperexecute.sh` copies it to the repository root because the CLI only reads it from the working directory.

## What runs

- `@Performance` specs in `tests/performance/login` and `tests/performance/onboarding`
- The Android device matrix entry (`Google Pixel 8 Pro` / `14.0`), mapped to the TestMu catalog name `Pixel 8 Pro` / `14`
- The with-SRP and without-SRP APKs the performance workflow stages for the run
- One HyperExecute job per build type (onboarding, imported wallet), autosplit across specs

## Secrets

The workflow reads `LT_USERNAME` and `LT_ACCESS_KEY` from GitHub Actions secrets. It does not put the access key in job outputs. Every performance run fails the credential job when either secret is missing or the TestMu API rejects them.

## Results

Artifact names are prefixed with `testmu-he-`. The aggregator labels those devices `Google Pixel 8 Pro (TestMu HE)`.

Network log capture stays off unless `TESTMU_NETWORK_LOGS=true`, so the timers measure the same class of session as before.
