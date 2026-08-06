const {
  computeE2EPlatformFlags,
  shouldBuildIosApps,
} = require('./compute-e2e-platform-flags.cjs');

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

  const mergeGroupInput = {
    ...baseInput,
    githubEventName: 'merge_group',
  };

  it('runs iOS only on merge_group for shared path changes', () => {
    const result = computeE2EPlatformFlags({
      ...mergeGroupInput,
      e2eTestFilesCount: 0,
      e2eTestOrIgnorableCount: 0,
    });

    expect(result.android).toBe(false);
    expect(result.ios).toBe(true);
    expect(result.e2eNeeded).toBe(true);
    expect(result.message).toContain('merge queue');
  });

  it('skips E2E on merge_group for android-only changes', () => {
    const result = computeE2EPlatformFlags({
      ...mergeGroupInput,
      e2eTestFilesCount: 0,
      e2eTestOrIgnorableCount: 0,
      androidCount: 1,
      androidOrIgnorableCount: 1,
    });

    expect(result.e2eNeeded).toBe(false);
    expect(result.message).toContain('Android covered');
  });

  it('skips E2E on merge_group for ignorable-only changes', () => {
    const result = computeE2EPlatformFlags({
      ...mergeGroupInput,
      e2eTestFilesCount: 0,
      ignorableCount: 1,
      e2eTestOrIgnorableCount: 1,
      changedSpecFiles: '',
    });

    expect(result.e2eNeeded).toBe(false);
    expect(result.message).toContain('ignorable-only');
  });

  it('runs iOS only on merge_group for ios-only path changes', () => {
    const result = computeE2EPlatformFlags({
      ...mergeGroupInput,
      e2eTestFilesCount: 0,
      e2eTestOrIgnorableCount: 0,
      iosCount: 1,
      iosOrIgnorableCount: 1,
    });

    expect(result.android).toBe(false);
    expect(result.ios).toBe(true);
    expect(result.nativeBuildNeeded).toBe(true);
  });

  it('runs iOS only on merge_group for test-only changes and reuses main builds', () => {
    const result = computeE2EPlatformFlags(mergeGroupInput);

    expect(result.android).toBe(false);
    expect(result.ios).toBe(true);
    expect(result.nativeBuildNeeded).toBe(false);
    expect(result.message).toContain('reuse main native builds');
  });

  it('skips E2E on merge_group when shouldSkipE2E is set', () => {
    const result = computeE2EPlatformFlags({
      ...mergeGroupInput,
      shouldSkipE2E: true,
      e2eTestFilesCount: 0,
      e2eTestOrIgnorableCount: 0,
    });

    expect(result.e2eNeeded).toBe(false);
    expect(result.message).toContain('skip signal');
  });
});

describe('shouldBuildIosApps', () => {
  const sharedMainPr = {
    githubEventName: 'pull_request',
    pullRequestBase: 'main',
    iosE2eNeeded: true,
    androidE2eNeeded: true,
  };

  it('skips iOS on feature PRs to main when Android also runs', () => {
    expect(shouldBuildIosApps(sharedMainPr)).toBe(false);
  });

  it('keeps iOS when ios/** paths changed', () => {
    expect(shouldBuildIosApps({ ...sharedMainPr, iosPathChanges: true })).toBe(
      true,
    );
  });

  it('keeps iOS when run-ios-e2e opts in', () => {
    expect(shouldBuildIosApps({ ...sharedMainPr, forceIosE2E: true })).toBe(
      true,
    );
  });

  it('keeps iOS when Appium iOS demand opts in', () => {
    expect(shouldBuildIosApps({ ...sharedMainPr, runAppiumIos: true })).toBe(
      true,
    );
  });

  it('keeps iOS for iOS-only path changes', () => {
    expect(
      shouldBuildIosApps({
        ...sharedMainPr,
        androidE2eNeeded: false,
      }),
    ).toBe(true);
  });

  it('keeps iOS on release PRs and non-PR events', () => {
    expect(
      shouldBuildIosApps({
        ...sharedMainPr,
        pullRequestBase: 'release/7.50.0',
      }),
    ).toBe(true);
    expect(
      shouldBuildIosApps({
        ...sharedMainPr,
        githubEventName: 'merge_group',
      }),
    ).toBe(true);
    expect(
      shouldBuildIosApps({
        ...sharedMainPr,
        githubEventName: 'push',
      }),
    ).toBe(true);
  });

  it('returns false when iOS E2E is not needed', () => {
    expect(
      shouldBuildIosApps({
        ...sharedMainPr,
        iosE2eNeeded: false,
      }),
    ).toBe(false);
  });
});
