import { isFlakyWorkflowUnitTestPath } from './flaky-unit-test-path';

describe('isFlakyWorkflowUnitTestPath', () => {
  it('accepts a Jest unit test file', () => {
    const result = isFlakyWorkflowUnitTestPath(
      'scripts/slack-audit-notification.test.ts',
    );

    expect(result).toBe(true);
  });

  it('rejects a component-view test', () => {
    const result = isFlakyWorkflowUnitTestPath(
      'app/components/Views/Foo/Foo.view.test.tsx',
    );

    expect(result).toBe(false);
  });

  it('rejects an integration test', () => {
    const result = isFlakyWorkflowUnitTestPath(
      'app/core/Engine/Engine.integration.test.ts',
    );

    expect(result).toBe(false);
  });

  it('rejects a legacy tests/smoke spec path', () => {
    const result = isFlakyWorkflowUnitTestPath(
      'tests/smoke/specs/login.spec.ts',
    );

    expect(result).toBe(false);
  });

  it('rejects an Appium smoke spec path', () => {
    const result = isFlakyWorkflowUnitTestPath(
      'tests/smoke-appium/accounts/create-wallet-account.spec.ts',
    );

    expect(result).toBe(false);
  });

  it('rejects a performance spec path', () => {
    const result = isFlakyWorkflowUnitTestPath(
      'tests/performance/login/eth-swap-flow.spec.ts',
    );

    expect(result).toBe(false);
  });

  it('rejects a regression spec path', () => {
    const result = isFlakyWorkflowUnitTestPath(
      'tests/regression/wallet/login.spec.ts',
    );

    expect(result).toBe(false);
  });

  it('rejects an e2e spec path', () => {
    const result = isFlakyWorkflowUnitTestPath(
      'app/features/SampleFeature/e2e/specs/sample-feature.spec.ts',
    );

    expect(result).toBe(false);
  });

  it('accepts a Jest unit test under tests/performance', () => {
    const result = isFlakyWorkflowUnitTestPath(
      'tests/performance/app-profiling-baseline-workflow.test.ts',
    );

    expect(result).toBe(true);
  });

  it('accepts a Jest unit test under tests/smoke', () => {
    const result = isFlakyWorkflowUnitTestPath(
      'tests/smoke/identity/utils/user-storage/userStorageMockttpController.test.ts',
    );

    expect(result).toBe(true);
  });

  // The detector reviews itself: its own tests run in the root unit shards, so
  // moving them into a nested folder must not drop them from the watched set.
  it('accepts its own tests from the nested detector folder', () => {
    const result = isFlakyWorkflowUnitTestPath(
      '.github/scripts/flaky-unit-test-detection/flaky-same-sha-history.test.ts',
    );

    expect(result).toBe(true);
  });
});
