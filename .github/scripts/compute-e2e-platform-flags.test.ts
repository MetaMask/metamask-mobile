import { computeE2EPlatformFlags } from './compute-e2e-platform-flags';

describe('computeE2EPlatformFlags', () => {
  const baseInput = {
    githubEventName: 'pull_request',
    isFork: false,
    shouldSkipE2E: false,
    allChangesCount: 1,
    ignorableCount: 0,
    e2eTestFilesCount: 1,
    e2eTestOrIgnorableCount: 1,
    e2eWorkflowsCount: 0,
    androidCount: 0,
    iosCount: 0,
    androidOrIgnorableCount: 0,
    iosOrIgnorableCount: 0,
    allChangesFiles: 'tests/smoke/wallet/foo.spec.ts',
  };

  it('skips native builds for test-only PR changes', () => {
    const result = computeE2EPlatformFlags(baseInput);

    expect(result).toMatchObject({
      android: true,
      ios: true,
      e2eNeeded: true,
      nativeBuildNeeded: false,
      runSmartE2ESelection: true,
      message: expect.stringContaining('test-only'),
    });
  });

  it('keeps native builds when app code changes', () => {
    const result = computeE2EPlatformFlags({
      ...baseInput,
      allChangesCount: 2,
      e2eTestOrIgnorableCount: 1,
      androidCount: 1,
      androidOrIgnorableCount: 1,
      allChangesFiles: 'app/components/Foo.tsx tests/smoke/wallet/foo.spec.ts',
    });

    expect(result.nativeBuildNeeded).toBe(true);
    expect(result.android).toBe(true);
    expect(result.ios).toBe(true);
  });

  it('skips E2E for ignorable-only changes', () => {
    const result = computeE2EPlatformFlags({
      ...baseInput,
      e2eTestFilesCount: 0,
      ignorableCount: 1,
      e2eTestOrIgnorableCount: 1,
      allChangesFiles: 'README.md',
    });

    expect(result.e2eNeeded).toBe(false);
    expect(result.nativeBuildNeeded).toBe(false);
    expect(result.runSmartE2ESelection).toBe(false);
  });

  it('requires native builds when E2E workflow files change', () => {
    const result = computeE2EPlatformFlags({
      ...baseInput,
      e2eWorkflowsCount: 1,
    });

    expect(result.nativeBuildNeeded).toBe(true);
  });
});
