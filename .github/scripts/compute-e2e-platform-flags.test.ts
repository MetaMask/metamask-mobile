const { computeE2EPlatformFlags } = require('./compute-e2e-platform-flags.cjs');

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
    changedSpecFiles: 'tests/smoke-appium/wallet/foo.spec.ts',
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
      changedSpecFiles: 'tests/smoke-appium/wallet/foo.spec.ts',
    });

    expect(result.nativeBuildNeeded).toBe(true);
    expect(result.android).toBe(true);
    expect(result.ios).toBe(true);
    expect(result.changedSpecFiles).toBe(
      'tests/smoke-appium/wallet/foo.spec.ts',
    );
  });

  it('skips E2E for ignorable-only changes', () => {
    const result = computeE2EPlatformFlags({
      ...baseInput,
      e2eTestFilesCount: 0,
      ignorableCount: 1,
      e2eTestOrIgnorableCount: 1,
      changedSpecFiles: '',
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

  it('runs Smart E2E selection for cherry-pick PRs targeting release/*', () => {
    const result = computeE2EPlatformFlags({
      ...baseInput,
      prBaseRef: 'release/1.0.0',
    });

    expect(result.runSmartE2ESelection).toBe(true);
  });

  it('keeps Android-only path selection for release cherry-pick PRs', () => {
    const result = computeE2EPlatformFlags({
      ...baseInput,
      prBaseRef: 'release/1.0.0',
      e2eTestFilesCount: 0,
      e2eTestOrIgnorableCount: 0,
      androidCount: 1,
      androidOrIgnorableCount: 1,
    });

    expect(result.android).toBe(true);
    expect(result.ios).toBe(false);
    expect(result.runSmartE2ESelection).toBe(true);
  });

  it('skips all E2E for PRs synchronizing release/* into stable', () => {
    const result = computeE2EPlatformFlags({
      ...baseInput,
      prBaseRef: 'stable',
    });

    expect(result).toMatchObject({
      android: false,
      ios: false,
      e2eNeeded: false,
      nativeBuildNeeded: false,
      runSmartE2ESelection: false,
      message: 'Skipping E2E (stable branch synchronization PR)',
    });
  });

  it('runs both platforms on pushes to main and release/*', () => {
    const result = computeE2EPlatformFlags({
      ...baseInput,
      githubEventName: 'push',
    });

    expect(result.android).toBe(true);
    expect(result.ios).toBe(true);
    expect(result.e2eNeeded).toBe(true);
    expect(result.message).toContain('push to main/release/*');
    expect(result.runSmartE2ESelection).toBe(false);
  });
});
