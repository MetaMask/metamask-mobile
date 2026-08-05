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
    changedSpecFiles: 'tests/smoke/wallet/foo.spec.ts',
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
      changedSpecFiles: 'tests/smoke/wallet/foo.spec.ts',
    });

    expect(result.nativeBuildNeeded).toBe(true);
    expect(result.android).toBe(true);
    expect(result.ios).toBe(true);
    expect(result.changedSpecFiles).toBe('tests/smoke/wallet/foo.spec.ts');
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

  it('skips E2E for a hard skip signal (label or commit tag)', () => {
    const result = computeE2EPlatformFlags({
      ...baseInput,
      shouldSkipE2E: true,
    });

    expect(result.e2eNeeded).toBe(false);
    expect(result.runSmartE2ESelection).toBe(false);
    expect(result.message).toContain('skip signal');
  });

  describe('branch-aware Smart E2E eligibility', () => {
    it('runs Smart E2E selection for PRs targeting main', () => {
      const result = computeE2EPlatformFlags({
        ...baseInput,
        prBaseRef: 'main',
      });

      expect(result.runSmartE2ESelection).toBe(true);
    });

    it('runs Smart E2E selection for cherry-pick PRs targeting release/*', () => {
      const result = computeE2EPlatformFlags({
        ...baseInput,
        prBaseRef: 'release/7.50.0',
      });

      expect(result.runSmartE2ESelection).toBe(true);
    });

    it('skips Smart E2E selection for PRs targeting stable, but still requires E2E', () => {
      const result = computeE2EPlatformFlags({
        ...baseInput,
        prBaseRef: 'stable',
      });

      expect(result.runSmartE2ESelection).toBe(false);
      expect(result.e2eNeeded).toBe(true);
      expect(result.android).toBe(true);
      expect(result.ios).toBe(true);
    });

    it('does not run Smart E2E selection outside of pull_request events, regardless of ref', () => {
      const pushResult = computeE2EPlatformFlags({
        ...baseInput,
        githubEventName: 'push',
        prBaseRef: '',
      });
      const scheduleResult = computeE2EPlatformFlags({
        ...baseInput,
        githubEventName: 'schedule',
        prBaseRef: '',
      });

      expect(pushResult.runSmartE2ESelection).toBe(false);
      expect(scheduleResult.runSmartE2ESelection).toBe(false);
    });
  });

  describe('push events (main and stable share the same E2E coverage)', () => {
    it('runs E2E for both platforms on push, independent of prBaseRef', () => {
      const result = computeE2EPlatformFlags({
        ...baseInput,
        githubEventName: 'push',
        prBaseRef: '',
      });

      expect(result.android).toBe(true);
      expect(result.ios).toBe(true);
      expect(result.e2eNeeded).toBe(true);
      expect(result.message).toContain('push to main/stable');
    });

    it('runs E2E for both platforms on the scheduled overnight run', () => {
      const result = computeE2EPlatformFlags({
        ...baseInput,
        githubEventName: 'schedule',
        prBaseRef: '',
      });

      expect(result.android).toBe(true);
      expect(result.ios).toBe(true);
    });
  });
});
