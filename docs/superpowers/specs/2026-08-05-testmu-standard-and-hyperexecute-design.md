# TestMu Standard and HyperExecute Parallel Performance Runs

## Goal

Run BrowserStack, direct TestMu Standard, and TestMu through HyperExecute in
the same Android performance pipeline using the same test selection, APK
variants, device matrix, and provider configuration wherever applicable.

The existing HyperExecute lane must remain operational and independently
identifiable.

## Design

### Provider lanes

The caller workflow will expose three Android lanes:

1. BrowserStack
2. TestMu Standard
3. TestMu HyperExecute

The Standard lane will be implemented in a new reusable workflow,
`performance-test-runner-testmu-standard.yml`. The existing
`performance-test-runner-testmu.yml` remains the HyperExecute runner.

### Shared inputs

Both TestMu lanes consume the same outputs from the Android build/upload job:

- without-SRP app URL for onboarding
- with-SRP app URL for imported-wallet tests
- app version
- device matrix
- test selection / grep pattern
- TestMu credentials

Each lane gets a distinct build/project name and artifact prefix:

- `testmu-standard-*`
- `testmu-he-*`

This prevents report and artifact collisions.

### Execution

The Standard reusable workflow runs the existing Playwright TestMu command
directly against the TestMu Appium hub.

The HyperExecute reusable workflow continues to generate and submit the
HyperExecute job, with its existing concurrency and artifact download flow.

Onboarding jobs for all providers run in parallel. Imported-wallet jobs wait
for the shared onboarding completion barrier, then run in their respective
provider lanes.

### Reporting

The aggregate job downloads all provider artifact prefixes and keeps their
results distinguishable by provider and orchestration mode. Existing
BrowserStack and HyperExecute artifact names are preserved.

## Failure isolation

- A failure in TestMu Standard must not skip TestMu HyperExecute.
- A failure in TestMu HyperExecute must not skip TestMu Standard.
- Both lanes retain their existing `continue-on-error` behavior so the
  comparison pipeline can aggregate all results.
- No TestMu-specific locator, wait, or flow fallback is added.

## Validation

The implementation will validate:

- the reusable workflow YAML;
- the caller workflow YAML and job conditions;
- distinct Standard and HyperExecute artifact names;
- shared with-SRP / without-SRP URL wiring;
- the existing TestMu resolver tests;
- a pipeline run containing all three Android provider lanes.
