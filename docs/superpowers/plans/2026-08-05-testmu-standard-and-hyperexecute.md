# TestMu Standard and HyperExecute Parallel Performance Runs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run BrowserStack, direct TestMu Standard, and TestMu HyperExecute in the same Android performance pipeline with identical test selection and APK variants.

**Architecture:** Add a dedicated Standard TestMu reusable workflow instead of changing the existing HyperExecute runner. Add Standard onboarding/imported-wallet jobs beside the existing BrowserStack and HE jobs, sharing the same build outputs and onboarding barrier while using distinct build names and artifact prefixes.

**Tech Stack:** GitHub Actions reusable workflows, Playwright, WebdriverIO/Appium, TestMu AI, HyperExecute, Yarn.

## Global Constraints

- Keep `performance-test-runner-testmu.yml` as the HyperExecute-only runner.
- Do not add TestMu-specific locators, waits, fallbacks, or test flows.
- Both TestMu lanes must receive the same `without-SRP` onboarding URL and `with-SRP` imported-wallet URL.
- Standard and HE artifacts must have different names and must not overwrite each other.
- Keep `continue-on-error` behavior so all provider results reach aggregation.
- Use the existing Pixel 7 Pro / Android 13 matrix and the existing TestMu capabilities.

---

### Task 1: Add the direct TestMu Standard reusable workflow

**Files:**
- Create: `.github/workflows/performance-test-runner-testmu-standard.yml`
- Reference: `.github/workflows/performance-test-runner-testmu.yml`
- Reference: `origin/MMQA-2042-TestMU-PoC:.github/workflows/performance-test-runner-testmu.yml`

**Interfaces:**
- Consumes the same `workflow_call` inputs as the HE runner: `platform`, `build_type`, `device_matrix`, `testmu_app_url`, `app_version`, `branch_name`, `testmu_build_name`, `sentry_target`, `build_variant`, `feature_flags_environment`, `grep_tags`, and `lt_username`.
- Consumes the same inherited secrets, including `LT_ACCESS_KEY`, wallet SRPs, password, and Sentry secrets.
- Produces artifacts named `testmu-standard-${platform}-${suite}-${device}-${os}`.

- [ ] **Step 1: Copy the Standard runner baseline from the direct TestMu implementation**

Use the direct runner from the direct TestMu branch as the starting point:

```bash
git show origin/MMQA-2042-TestMU-PoC:.github/workflows/performance-test-runner-testmu.yml \
  > .github/workflows/performance-test-runner-testmu-standard.yml
```

- [ ] **Step 2: Remove HyperExecute-only behavior**

Remove the HyperExecute CLI invocation, generated YAML, HE concurrency inputs, and HE artifact download. Keep the direct Playwright command selection:

```bash
if [ "${{ inputs.build_type }}" = "onboarding" ]; then
  BASE_CMD="yarn run-playwright:${{ inputs.platform }}-onboarding-testmu"
elif [ "${{ inputs.build_type }}" = "mm-connect" ]; then
  BASE_CMD="yarn run-playwright:mm-connect-${{ inputs.platform }}-testmu"
else
  BASE_CMD="yarn run-playwright:${{ inputs.platform }}-testmu"
fi

if [ -n "$GREP_TAGS" ]; then
  $BASE_CMD --grep "$GREP_TAGS" --pass-with-no-tests
else
  $BASE_CMD
fi
```

- [ ] **Step 3: Preserve provider configuration and secrets**

Keep the same TestMu environment variables and app URL mapping as the existing Standard provider. Do not change `TestMuAIConfigBuilder`, `TestMuAIProvider`, or the Appium capabilities for this task.

- [ ] **Step 4: Use a Standard-specific artifact name**

Set the upload artifact name to:

```yaml
name: testmu-standard-${{ inputs.platform }}-${{ inputs.build_type == 'onboarding' && 'onboarding-flow' || inputs.build_type }}-test-results-${{ matrix.device.name }}-${{ matrix.device.os_version }}
```

- [ ] **Step 5: Validate the reusable workflow**

Run:

```bash
python3 - <<'PY'
import yaml
with open(".github/workflows/performance-test-runner-testmu-standard.yml") as f:
    yaml.safe_load(f)
print("YAML parsed")
PY
```

Expected: `YAML parsed`.

- [ ] **Step 6: Commit the standalone runner**

```bash
git add .github/workflows/performance-test-runner-testmu-standard.yml
git commit -m "feat(perf): add direct TestMu standard runner"
```

### Task 2: Add Standard onboarding and imported-wallet jobs

**Files:**
- Modify: `.github/workflows/run-performance-e2e.yml`

**Interfaces:**
- Standard onboarding consumes `without-srp-testmu-url`.
- Standard imported-wallet consumes `with-srp-testmu-url`.
- Both jobs use `performance-test-runner-testmu-standard.yml`.
- Existing BrowserStack and HE jobs remain unchanged.

- [ ] **Step 1: Add the Standard onboarding job**

Add a job beside the existing HE onboarding job:

```yaml
run-android-onboarding-tests-testmu-standard:
  name: '[TestMu Standard] Run Android Onboarding Tests'
  uses: ./.github/workflows/performance-test-runner-testmu-standard.yml
  needs:
    [
      read-device-matrix,
      trigger-android-dual-versions,
      upload-reused-apks-to-testmu,
      set-build-names,
      determine-branch-name,
      compute-test-selection,
      check-testmu-credentials,
    ]
  if: >-
    always() && !failure() && !cancelled() &&
    inputs.enable_testmu_benchmark != false &&
    needs.check-testmu-credentials.outputs.testmu_ready == 'true' &&
    needs.compute-test-selection.outputs.run_tests == 'true' &&
    (needs.trigger-android-dual-versions.result == 'skipped' || needs.trigger-android-dual-versions.result == 'success') &&
    (needs.upload-reused-apks-to-testmu.result == 'skipped' || needs.upload-reused-apks-to-testmu.result == 'success') &&
    (
      needs.upload-reused-apks-to-testmu.outputs.without-srp-testmu-url != '' ||
      needs.trigger-android-dual-versions.outputs.without-srp-testmu-url != ''
    )
  with:
    platform: android
    build_type: onboarding
    sentry_target: ${{ inputs.sentry_target || 'test' }}
    build_variant: ${{ inputs.build_variant || 'e2e' }}
    device_matrix: ${{ needs.read-device-matrix.outputs.android_matrix }}
    testmu_app_url: ${{ needs.upload-reused-apks-to-testmu.outputs.without-srp-testmu-url || needs.trigger-android-dual-versions.outputs.without-srp-testmu-url }}
    app_version: ${{ needs.upload-reused-apks-to-testmu.outputs.without-srp-version || needs.trigger-android-dual-versions.outputs.without-srp-testmu-version || 'Manual-Input' }}
    branch_name: ${{ needs.determine-branch-name.outputs.branch_name }}
    testmu_build_name: ${{ needs.set-build-names.outputs.testmu_android_build_name }}-Standard
    lt_username: ${{ needs.check-testmu-credentials.outputs.lt_username }}
    grep_tags: ${{ needs.compute-test-selection.outputs.grep_pattern }}
  secrets: inherit
```

- [ ] **Step 2: Add the Standard imported-wallet job**

Use the same structure and dependencies as Standard onboarding, but:

```yaml
name: '[TestMu Standard] Run Android Imported Wallet Tests'
build_type: imported-wallet
testmu_app_url: ${{ needs.upload-reused-apks-to-testmu.outputs.with-srp-testmu-url || needs.trigger-android-dual-versions.outputs.with-srp-testmu-url }}
app_version: ${{ needs.upload-reused-apks-to-testmu.outputs.with-srp-version || needs.trigger-android-dual-versions.outputs.with-srp-testmu-version || 'Manual-Input' }}
testmu_build_name: ${{ needs.set-build-names.outputs.testmu_android_build_name }}-Standard
```

The imported-wallet Standard job must depend on `wait-for-onboarding-completion`, just like the existing imported-wallet jobs.

- [ ] **Step 3: Extend the onboarding barrier**

Add `run-android-onboarding-tests-testmu-standard` to `wait-for-onboarding-completion.needs`. Keep `if: always()` so the imported-wallet jobs are not blocked by an unrelated provider failure.

- [ ] **Step 4: Extend aggregation dependencies**

Add both Standard jobs to `aggregate-results.needs`. The existing artifact download pattern must include `testmu-standard-*` artifacts without changing BrowserStack or HE artifact names.

- [ ] **Step 5: Validate caller workflow**

Run:

```bash
python3 - <<'PY'
import yaml
with open(".github/workflows/run-performance-e2e.yml") as f:
    yaml.safe_load(f)
print("YAML parsed")
PY
```

Expected: `YAML parsed`.

- [ ] **Step 6: Commit the caller jobs**

```bash
git add .github/workflows/run-performance-e2e.yml
git commit -m "feat(perf): run TestMu standard beside HyperExecute"
```

### Task 3: Add tests and validate result separation

**Files:**
- Modify: `tests/scripts/aggregate-performance-reports.mjs` only if Standard artifacts are not already classified by their prefix.
- Test: existing aggregation tests or a focused fixture test if classification requires code changes.
- Validate: `.github/workflows/run-performance-e2e.yml`
- Validate: `.github/workflows/performance-test-runner-testmu-standard.yml`

- [ ] **Step 1: Verify provider artifact discovery**

Confirm the aggregator's artifact glob consumes:

```text
testmu-standard-android-onboarding-flow-test-results-*
testmu-standard-android-imported-wallet-test-results-*
testmu-android-onboarding-flow-test-results-*
testmu-android-imported-wallet-test-results-*
android-onboarding-flow-test-results-*
android-imported-wallet-test-results-*
```

- [ ] **Step 2: Add or update focused aggregation coverage**

If the aggregator uses filename prefixes, add fixtures proving that Standard and HE are emitted as separate providers/modes and do not overwrite each other. Preserve existing BrowserStack and TestMu HE behavior.

- [ ] **Step 3: Run focused tests**

Run:

```bash
yarn jest tests/framework/services/providers/testmu/TestMuDeviceResolver.test.ts --no-coverage
```

Expected: all resolver tests pass.

- [ ] **Step 4: Validate formatting and workflow syntax**

Run:

```bash
git diff --check
python3 - <<'PY'
import yaml
for path in [
    ".github/workflows/run-performance-e2e.yml",
    ".github/workflows/performance-test-runner-testmu-standard.yml",
]:
    with open(path) as f:
        yaml.safe_load(f)
    print(path, "YAML parsed")
PY
```

- [ ] **Step 5: Commit validation changes**

```bash
git add tests/scripts/aggregate-performance-reports.mjs tests
git commit -m "test(perf): separate standard and HyperExecute reports"
```

### Task 4: Run the three-lane pipeline and verify isolation

**Files:**
- No source changes expected unless validation exposes a wiring issue.

- [ ] **Step 1: Dispatch the workflow with TestMu enabled**

Use the manual workflow with `enable_testmu_benchmark: true` and the normal performance test selection so all three lanes receive the same suite.

- [ ] **Step 2: Verify all three Android jobs start**

Expected jobs:

```text
Performance Test Android (Onboarding)
[TestMu Standard] Run Android Onboarding Tests
[TestMu/HE] Run Android Onboarding Tests
Performance Test Android (Imported Wallet)
[TestMu Standard] Run Android Imported Wallet Tests
[TestMu/HE] Run Android Imported Wallet Tests
```

- [ ] **Step 3: Verify APK wiring**

Confirm logs show:

```text
BrowserStack onboarding      -> without-SRP
TestMu Standard onboarding   -> without-SRP
TestMu HE onboarding         -> without-SRP
BrowserStack imported wallet -> with-SRP
TestMu Standard imported     -> with-SRP
TestMu HE imported           -> with-SRP
```

- [ ] **Step 4: Verify artifact separation**

Confirm Standard and HE artifacts have distinct names and are both present in the aggregate results.

- [ ] **Step 5: Commit any wiring-only fixes separately**

```bash
git add .github/workflows tests
git commit -m "fix(perf): wire parallel TestMu provider lanes"
```
