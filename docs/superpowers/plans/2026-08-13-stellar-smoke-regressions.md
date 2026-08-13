# Stellar Smoke Regressions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve opt-in Stellar E2E support without changing existing Solana, permission, or Snap smoke behavior.

**Architecture:** Keep Stellar code-fenced into E2E builds, but activate its remote flag and network enablement only through `FixtureBuilder.withStellarEnabled()`. Register the Stellar provider with its dedicated timeout while restoring the shared provider defaults used by Solana, Bitcoin, and Tron. Use framework-owned element return types in the Stellar page object so it follows current Appium lint rules.

**Tech Stack:** TypeScript, React Native, Jest, Appium smoke fixtures, Yarn 4.

## Global Constraints

- Branch from `e2e-stellar` and target the resulting PR back to `e2e-stellar`.
- Use Yarn only.
- Do not add dependencies.
- Keep Stellar E2E build code fencing intact.

---

### Task 1: Restore Existing Provider Behavior

**Files:**
- Modify: `app/core/Engine/controllers/multichain-account-service/multichain-account-service-init.test.ts`
- Modify: `app/core/Engine/controllers/multichain-account-service/multichain-account-service-init.ts`

**Interfaces:**
- Consumes: `MultichainAccountService` constructor provider configuration.
- Produces: unchanged shared provider configuration plus one Stellar custom provider.

- [ ] **Step 1: Write the failing regression assertion**

Assert that Solana configuration exactly preserves `createAccounts.timeoutMs: 3000`, does not enable batched creation, and does not force discovery enabled.

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn jest app/core/Engine/controllers/multichain-account-service/multichain-account-service-init.test.ts --runInBand`

Expected: FAIL because Solana currently has `batched: true` and shared discovery has `enabled: true`.

- [ ] **Step 3: Write minimal implementation**

Remove `enabled: true` from shared discovery, remove the Solana-specific batched override, and pass `snapAccountProviderConfig` directly for `SOL_ACCOUNT_PROVIDER_NAME`. Keep `batched: true`, `timeoutMs: 30000`, and `discovery.enabled: true` only in `stellarSnapAccountProviderConfig`.

- [ ] **Step 4: Run test to verify it passes**

Run the focused Jest command from Step 2.

Expected: PASS.

### Task 2: Make Stellar Fixture State Opt-In

**Files:**
- Modify: `tests/framework/fixtures/json/default-fixture.json`
- Modify: `tests/framework/fixtures/FixtureBuilder.ts`
- Modify: `tests/feature-flags/feature-flag-registry.ts`

**Interfaces:**
- Consumes: `FixtureBuilder.withStellarEnabled()`.
- Produces: Stellar feature flag and network enablement only for Stellar tests.

- [ ] **Step 1: Verify the global-state regression**

Confirm the default fixture currently enables `stellarAccounts` and duplicates Stellar network configuration entries.

- [ ] **Step 2: Write minimal implementation**

Remove the duplicate Stellar network entries and global `stellarAccounts` override from `default-fixture.json`. Extend `withStellarEnabled()` to merge `RemoteFeatureFlagController.remoteFeatureFlags.stellarAccounts = { enabled: true, featureVersion: null, minimumVersion: '0.0.0' }`. Restore the registry's existing disabled production default (`minimumVersion: '0.0.1'`, `enabled: false`).

- [ ] **Step 3: Validate fixture and registry**

Run: `yarn jest tests/feature-flags/feature-flag-registry.test.ts --runInBand`

Expected: PASS.

### Task 3: Fix Stellar Page Object Lint

**Files:**
- Modify: `tests/page-objects/Browser/StellarTestDapp.ts`

**Interfaces:**
- Consumes: `Matchers.getElementByXPath`.
- Produces: the same page-object selectors without importing restricted `PlaywrightAdapter`.

- [ ] **Step 1: Verify lint fails**

Run: `yarn eslint tests/page-objects/Browser/StellarTestDapp.ts`

Expected: FAIL with `no-restricted-imports` for `PlaywrightAdapter`.

- [ ] **Step 2: Write minimal implementation**

Remove the restricted type import and use `ReturnType<typeof Matchers.getElementByXPath>` for the local selector helper.

- [ ] **Step 3: Verify lint passes**

Run the focused ESLint command from Step 1.

Expected: PASS with zero errors.

### Task 4: Final Verification and Delivery

**Files:**
- Verify all modified files.

**Interfaces:**
- Produces: committed branch and draft PR targeting `e2e-stellar`.

- [ ] **Step 1: Run focused tests**

Run the provider-init Jest test, feature-flag registry Jest test, TypeScript check, and focused ESLint.

- [ ] **Step 2: Inspect the diff**

Confirm no existing Solana provider behavior is changed relative to `e2e-stellar`'s base behavior and Stellar remains available through `withStellarEnabled()`.

- [ ] **Step 3: Commit, push, and create PR**

Commit the logical fix, push with upstream tracking, and create a draft PR with base branch `e2e-stellar`.
