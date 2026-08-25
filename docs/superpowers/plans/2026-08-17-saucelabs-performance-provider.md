# Sauce Labs Performance Provider Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Sauce Labs as an optional third performance provider and produce one deduplicated comparison report for BrowserStack, TestMu HyperExecute, and Sauce Labs.

**Architecture:** Create a Sauce Labs-specific WebDriver provider and reusable workflow, rather than modifying BrowserStack or TestMu capabilities. The caller workflow will expose `enable_saucelabs` and run Sauce onboarding/imported lanes independently. Sauce results will use a `saucelabs-` artifact prefix and the existing provider-aware aggregator.

**Tech Stack:** GitHub Actions reusable workflows, WebdriverIO/Appium, TypeScript, Playwright performance reporters, Node.js test scripts.

## Global Constraints

- Sauce Labs is optional and must run only when `enable_saucelabs` is true.
- Sauce device name is exactly `Google_Pixel_7_POC49`.
- Sauce Android `platformVersion` is intentionally omitted.
- BrowserStack and TestMu behavior must remain unchanged.
- Sauce credentials must come from `SAUCE_USERNAME` and `SAUCE_ACCESS_KEY` secrets.
- Sauce app uploads must use separate onboarding/imported APKs and never reuse the wrong APK variant.
- Final results must be deduplicated by provider, platform, device, and scenario.
- Tests must preserve quality-gate failures, infrastructure/test errors, and missing-metric results as distinct reasons.

---

### Task 1: Add Sauce Labs provider configuration

**Files:**
- Create: `tests/framework/services/providers/saucelabs/SauceLabsConfigBuilder.ts`
- Create: `tests/framework/services/providers/saucelabs/SauceLabsConfigBuilder.test.ts`
- Modify: `tests/framework/services/providers/index.ts`
- Modify: provider selection/configuration code that maps `TEST_PLATFORM` and `CLOUD_PROVIDER`

**Interfaces:**
- Consumes `ProjectConfig`, `SauceLabsConfig`, `SAUCE_USERNAME`, `SAUCE_ACCESS_KEY`, `SAUCE_APP`, and `SAUCE_DEVICE_NAME`.
- Produces a WebdriverIO config using Sauce Labs endpoint `ondemand.us-west-1.saucelabs.com/wd/hub`.
- Capabilities must include `appium:deviceName: Google_Pixel_7_POC49`, omit `appium:platformVersion`, use Android UiAutomator2, full reset, and the same command/element settings needed by the existing performance framework.

- [ ] Write failing unit tests for required credentials, exact device name, omitted platform version, and app capability.
- [ ] Run the targeted test and verify failure before implementation.
- [ ] Implement the minimal Sauce Labs config builder with explicit validation for missing credentials and app URL.
- [ ] Add provider selection without changing BrowserStack/TestMu selection.
- [ ] Run the targeted test and verify it passes.
- [ ] Commit the provider configuration as one logical commit.

### Task 2: Add Sauce Labs app upload and reusable runners

**Files:**
- Create: `.github/workflows/performance-test-runner-saucelabs.yml`
- Modify: `.github/workflows/run-performance-e2e.yml`
- Modify: `.github/workflows/run-performance-e2e-manual.yml`
- Create or modify: Sauce upload action/script used by the workflow

**Interfaces:**
- Manual workflow input: `enable_saucelabs` boolean, default `false`.
- Caller workflow input: `enable_saucelabs` boolean, default `false`.
- Reusable runner inputs: platform, build type, Sauce app URL, branch/build name, device matrix, tags, and credentials.
- Output artifacts: `saucelabs-android-onboarding-*` and `saucelabs-android-imported-wallet-*`.

- [ ] Add failing workflow/script tests for disabled Sauce lanes, missing Sauce credentials, and separate onboarding/imported app URLs.
- [ ] Add the manual input and pass it through the manual-to-reusable workflow call.
- [ ] Add Sauce app upload steps using onboarding `without-SRP` and imported-wallet `with-SRP` APKs.
- [ ] Add onboarding and imported-wallet Sauce jobs gated by `enable_saucelabs`.
- [ ] Configure the Sauce matrix with exactly `Google_Pixel_7_POC49` and no OS version.
- [ ] Ensure Sauce jobs can run alongside BrowserStack and TestMu without changing their dependencies or concurrency groups.
- [ ] Run workflow validation and targeted script tests.
- [ ] Commit the workflow/upload changes as one logical commit.

### Task 3: Integrate Sauce results into reporting

**Files:**
- Modify: `tests/scripts/aggregate-performance-reports.mjs`
- Modify: `tests/scripts/aggregate-performance-reports.test.mjs`
- Modify: `tests/scripts/generate-performance-pr-comment.mjs` if provider sections are rendered there

**Interfaces:**
- Provider detection must classify `saucelabs-` artifacts as `saucelabs`.
- `providerResults.saucelabs` must contain one entry per unique scenario with passed, failed, mixed, attempts, failure reasons, and quality-gate violations.
- Existing BrowserStack/TestMu summary fields remain backward compatible.

- [ ] Add tests for Sauce artifact classification and deduplication.
- [ ] Add tests for one Sauce scenario with a quality-gate failure and one with an infrastructure failure.
- [ ] Run the aggregation tests and confirm all providers remain separate.
- [ ] Update final HTML/provider breakdown to include Sauce Labs only when artifacts exist.
- [ ] Commit reporting changes as one logical commit.

### Task 4: Validate the three-provider workflow

**Files:**
- Modify: `docs/testing` or performance README with Sauce setup and required secrets.
- Verify all workflow and test files from Tasks 1–3.

- [ ] Run targeted TypeScript tests for the Sauce builder.
- [ ] Run aggregation and reporting tests.
- [ ] Run workflow syntax/actionlint validation.
- [ ] Verify the three-provider manual dispatch graph with Sauce enabled and with Sauce disabled.
- [ ] Confirm artifacts and final report show separate BrowserStack, TestMu HE, and Sauce Labs sections.
- [ ] Run the repository verification commands relevant to changed files.
- [ ] Commit documentation and final validation changes.
