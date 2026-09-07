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

  it('rejects an Appium smoke spec path', () => {
    const result = isFlakyWorkflowUnitTestPath(
      'tests/smoke/specs/login.spec.ts',
    );

    expect(result).toBe(false);
  });
});
