import {
  computeE2EPlatformFlags,
  applyE2ELabelOverrides,
  resolveE2EPlatformRequirements,
} from './compute-e2e-platform-flags.mjs';

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

  it('uses main builds for test-only PR changes', () => {
    const result = computeE2EPlatformFlags(baseInput);

    expect(result).toMatchObject({
      android: true,
      ios: true,
      e2eNeeded: true,
      useMainBuildsForTestOnlyPrs: true,
      runSmartE2ESelection: true,
      message: expect.stringContaining('test-only'),
    });
  });

  it('uses the current source for app code changes', () => {
    const result = computeE2EPlatformFlags({
      ...baseInput,
      allChangesCount: 2,
      e2eTestOrIgnorableCount: 1,
      androidCount: 1,
      androidOrIgnorableCount: 1,
      changedSpecFiles: 'tests/smoke-appium/wallet/foo.spec.ts',
    });

    expect(result.useMainBuildsForTestOnlyPrs).toBe(false);
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
    expect(result.useMainBuildsForTestOnlyPrs).toBe(false);
    expect(result.runSmartE2ESelection).toBe(false);
  });

  it('uses the current source when E2E workflow files change', () => {
    const result = computeE2EPlatformFlags({
      ...baseInput,
      e2eWorkflowsCount: 1,
    });

    expect(result.useMainBuildsForTestOnlyPrs).toBe(false);
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
      useMainBuildsForTestOnlyPrs: false,
      runSmartE2ESelection: false,
      message: 'Skipping E2E (stable branch synchronization PR)',
    });
  });

  it('skips all E2E for merge queue events', () => {
    const result = computeE2EPlatformFlags({
      ...baseInput,
      githubEventName: 'merge_group',
    });

    expect(result).toMatchObject({
      android: false,
      ios: false,
      e2eNeeded: false,
      useMainBuildsForTestOnlyPrs: false,
      runSmartE2ESelection: false,
      message: 'Skipping E2E (merge queue)',
    });
  });

  it('skips all E2E for fork PRs', () => {
    const result = computeE2EPlatformFlags({
      ...baseInput,
      isFork: true,
    });

    expect(result).toMatchObject({
      android: false,
      ios: false,
      e2eNeeded: false,
      runSmartE2ESelection: false,
      message: 'Skipping E2E (fork PR)',
    });
  });

  it('skips all E2E for hard skip signals', () => {
    const result = computeE2EPlatformFlags({
      ...baseInput,
      shouldSkipE2E: true,
    });

    expect(result).toMatchObject({
      android: false,
      ios: false,
      e2eNeeded: false,
      runSmartE2ESelection: false,
      message: 'Skipping E2E (skip signal)',
    });
  });

  it('selects Android only for Android-only path filters', () => {
    const result = computeE2EPlatformFlags({
      ...baseInput,
      e2eTestFilesCount: 0,
      e2eTestOrIgnorableCount: 0,
      androidCount: 1,
      androidOrIgnorableCount: 1,
    });

    expect(result.android).toBe(true);
    expect(result.ios).toBe(false);
    expect(result.useMainBuildsForTestOnlyPrs).toBe(false);
  });

  it('selects iOS only for iOS-only path filters outside request-only branches', () => {
    const result = computeE2EPlatformFlags({
      ...baseInput,
      prBaseRef: 'feature/1',
      e2eTestFilesCount: 0,
      e2eTestOrIgnorableCount: 0,
      iosCount: 1,
      iosOrIgnorableCount: 1,
    });

    expect(result).toMatchObject({
      android: false,
      ios: true,
      e2eNeeded: true,
      runSmartE2ESelection: true,
    });
  });

  it('runs both platforms for E2E test-only pushes', () => {
    const result = computeE2EPlatformFlags({
      ...baseInput,
      githubEventName: 'push',
    });

    expect(result.android).toBe(true);
    expect(result.ios).toBe(true);
    expect(result.e2eNeeded).toBe(true);
    expect(result.useMainBuildsForTestOnlyPrs).toBe(false);
    expect(result.message).toContain('test-only');
    expect(result.runSmartE2ESelection).toBe(false);
  });

  it('runs both platforms for shared app changes pushed to main or release/*', () => {
    const result = computeE2EPlatformFlags({
      ...baseInput,
      githubEventName: 'push',
      e2eTestFilesCount: 0,
      e2eTestOrIgnorableCount: 0,
    });

    expect(result).toMatchObject({
      android: true,
      ios: true,
      e2eNeeded: true,
    });
  });

  it('selects Android only for Android-only pushes', () => {
    const result = computeE2EPlatformFlags({
      ...baseInput,
      githubEventName: 'push',
      e2eTestFilesCount: 0,
      e2eTestOrIgnorableCount: 0,
      androidCount: 1,
      androidOrIgnorableCount: 1,
    });

    expect(result).toMatchObject({
      android: true,
      ios: false,
      e2eNeeded: true,
    });
  });

  it('skips ignorable-only pushes to main or release/*', () => {
    const result = computeE2EPlatformFlags({
      ...baseInput,
      githubEventName: 'push',
      ignorableCount: 1,
      e2eTestFilesCount: 0,
      e2eTestOrIgnorableCount: 1,
    });

    expect(result).toMatchObject({
      android: false,
      ios: false,
      e2eNeeded: false,
      message: 'Skipping E2E (ignorable-only changes)',
    });
  });

  it('keeps scheduled runs on both platforms', () => {
    const result = computeE2EPlatformFlags({
      ...baseInput,
      githubEventName: 'schedule',
      ignorableCount: 1,
      e2eTestFilesCount: 0,
      e2eTestOrIgnorableCount: 1,
    });

    expect(result).toMatchObject({
      android: true,
      ios: true,
      e2eNeeded: true,
    });
  });

  it('drops iOS from both-platform selection for PRs targeting main', () => {
    const result = computeE2EPlatformFlags({
      ...baseInput,
      prBaseRef: 'main',
      e2eTestFilesCount: 0,
      e2eTestOrIgnorableCount: 0,
      androidCount: 1,
      iosCount: 1,
      androidOrIgnorableCount: 1,
      iosOrIgnorableCount: 1,
    });

    expect(result).toMatchObject({
      android: true,
      ios: false,
      e2eNeeded: true,
      useMainBuildsForTestOnlyPrs: false,
    });
    expect(result.message).toContain('iOS not requested for this PR');
  });

  it('drops iOS from test-only selection for PRs targeting main', () => {
    const result = computeE2EPlatformFlags({
      ...baseInput,
      prBaseRef: 'main',
    });

    expect(result).toMatchObject({
      android: true,
      ios: false,
      e2eNeeded: true,
      useMainBuildsForTestOnlyPrs: true,
    });
  });

  it('leaves no E2E to run when an iOS-only PR targets main', () => {
    const result = computeE2EPlatformFlags({
      ...baseInput,
      prBaseRef: 'main',
      e2eTestFilesCount: 0,
      e2eTestOrIgnorableCount: 0,
      iosCount: 1,
      iosOrIgnorableCount: 1,
    });

    expect(result).toMatchObject({
      android: false,
      ios: false,
      e2eNeeded: false,
      useMainBuildsForTestOnlyPrs: false,
      runSmartE2ESelection: false,
    });
  });

  it('suppresses iOS for cherry-pick PRs targeting release/* without a request', () => {
    const result = computeE2EPlatformFlags({
      ...baseInput,
      prBaseRef: 'release/1.0.0',
      e2eTestFilesCount: 0,
      e2eTestOrIgnorableCount: 0,
      androidCount: 1,
      iosCount: 1,
      androidOrIgnorableCount: 1,
      iosOrIgnorableCount: 1,
    });

    expect(result).toMatchObject({
      android: true,
      ios: false,
      e2eNeeded: true,
    });
    expect(result.message).toContain('iOS not requested for this PR');
  });

  it('keys the main-PR iOS suppression off the event, not the ref', () => {
    const result = computeE2EPlatformFlags({
      ...baseInput,
      githubEventName: 'push',
      prBaseRef: 'main',
    });

    expect(result.android).toBe(true);
    expect(result.ios).toBe(true);
  });
});

describe('applyE2ELabelOverrides', () => {
  const overrideInput = {
    runAppiumIosLabel: true,
    githubEventName: 'pull_request',
    prBaseRef: 'main',
    isFork: false,
    shouldSkipE2E: false,
    ignorableOnly: false,
    testOnlyChanges: false,
  };

  const androidOnlyPathFiltersFor = (prBaseRef: string) => ({
    githubEventName: 'pull_request',
    prBaseRef,
    isFork: false,
    shouldSkipE2E: false,
    allChangesCount: 1,
    ignorableCount: 0,
    e2eTestFilesCount: 0,
    e2eTestOrIgnorableCount: 0,
    e2eWorkflowsCount: 0,
    androidCount: 1,
    iosCount: 0,
    androidOrIgnorableCount: 1,
    iosOrIgnorableCount: 0,
  });

  it('opts into iOS build via run-appium-ios-tests on PRs targeting main', () => {
    const baseFlags = computeE2EPlatformFlags(androidOnlyPathFiltersFor('main'));

    const result = applyE2ELabelOverrides(baseFlags, overrideInput);

    // The label widens to iOS even though path filters selected Android only.
    expect(result).toMatchObject({
      android: true,
      ios: true,
      e2eNeeded: true,
      useMainBuildsForTestOnlyPrs: false,
      message: expect.stringContaining('run-appium-ios-tests'),
    });
  });

  it('opts into both platforms for smoke-infrastructure changes on main', () => {
    const result = applyE2ELabelOverrides(
      {
        android: false,
        ios: false,
        e2eNeeded: false,
        useMainBuildsForTestOnlyPrs: false,
        runSmartE2ESelection: false,
        message: 'E2E platform selection',
      },
      {
        ...overrideInput,
        runAppiumIosLabel: false,
        e2eSmokeInfraCount: 1,
      },
    );

    expect(result).toMatchObject({
      android: true,
      ios: true,
      e2eNeeded: true,
      message: expect.stringContaining('e2e smoke infrastructure changes'),
    });
  });

  it('opts into iOS build via skip-smart-e2e-selection when path filters selected iOS', () => {
    const baseFlags = computeE2EPlatformFlags({
      ...androidOnlyPathFiltersFor('main'),
      iosCount: 1,
      iosOrIgnorableCount: 1,
    });

    const result = applyE2ELabelOverrides(baseFlags, {
      ...overrideInput,
      runAppiumIosLabel: false,
      skipSmartSelection: true,
    });

    expect(result).toMatchObject({
      android: true,
      ios: true,
      e2eNeeded: true,
      message: expect.stringContaining('skip-smart-e2e-selection'),
    });
  });

  it('widens skip-smart-e2e-selection to both platforms on an iOS-only PR', () => {
    const baseFlags = computeE2EPlatformFlags({
      ...androidOnlyPathFiltersFor('feature/1'),
      androidCount: 0,
      androidOrIgnorableCount: 0,
      iosCount: 1,
      iosOrIgnorableCount: 1,
    });

    const result = applyE2ELabelOverrides(baseFlags, {
      ...overrideInput,
      prBaseRef: 'feature/1',
      runAppiumIosLabel: false,
      skipSmartSelection: true,
    });

    expect(result).toMatchObject({
      android: true,
      ios: true,
      e2eNeeded: true,
    });
  });

  it('widens skip-smart-e2e-selection to both platforms on an Android-only PR', () => {
    const baseFlags = computeE2EPlatformFlags(androidOnlyPathFiltersFor('main'));

    const result = applyE2ELabelOverrides(baseFlags, {
      ...overrideInput,
      runAppiumIosLabel: false,
      skipSmartSelection: true,
    });

    expect(result).toMatchObject({ android: true, ios: true, e2eNeeded: true });
    expect(result.message).toContain('skip-smart-e2e-selection');
  });

  it('restores Smart E2E selection when a label revives an iOS-only PR into main', () => {
    const baseFlags = computeE2EPlatformFlags({
      ...androidOnlyPathFiltersFor('main'),
      androidCount: 0,
      androidOrIgnorableCount: 0,
      iosCount: 1,
      iosOrIgnorableCount: 1,
    });

    // Suppressed all the way down to no platforms, which turns Smart E2E off.
    expect(baseFlags).toMatchObject({
      android: false,
      ios: false,
      e2eNeeded: false,
      runSmartE2ESelection: false,
    });

    const result = applyE2ELabelOverrides(baseFlags, overrideInput);

    expect(result).toMatchObject({
      android: false,
      ios: true,
      e2eNeeded: true,
      useMainBuildsForTestOnlyPrs: false,
      runSmartE2ESelection: true,
    });
  });

  it('opts into iOS build on Android-only release/* PRs via run-appium-ios-tests', () => {
    const baseFlags = computeE2EPlatformFlags(
      androidOnlyPathFiltersFor('release/1.0.0'),
    );

    const result = applyE2ELabelOverrides(baseFlags, {
      ...overrideInput,
      prBaseRef: 'release/1.0.0',
    });

    expect(result).toMatchObject({
      android: true,
      ios: true,
      e2eNeeded: true,
      useMainBuildsForTestOnlyPrs: false,
      message: expect.stringContaining('run-appium-ios-tests'),
    });
  });

  it('does not opt into iOS build for ignorable-only PRs', () => {
    const baseFlags = computeE2EPlatformFlags({
      githubEventName: 'pull_request',
      isFork: false,
      shouldSkipE2E: false,
      allChangesCount: 1,
      ignorableCount: 1,
      e2eTestFilesCount: 0,
      e2eTestOrIgnorableCount: 1,
      e2eWorkflowsCount: 0,
      androidCount: 0,
      iosCount: 0,
      androidOrIgnorableCount: 0,
      iosOrIgnorableCount: 0,
    });

    const result = applyE2ELabelOverrides(baseFlags, {
      ...overrideInput,
      ignorableOnly: true,
    });

    expect(result).toMatchObject({
      android: false,
      ios: false,
      e2eNeeded: false,
    });
  });
});

describe('resolveE2EPlatformRequirements', () => {
  const eligibleLabelInput = {
    runAppiumIosLabel: false,
    githubEventName: 'pull_request',
    prBaseRef: 'main',
    isFork: false,
    shouldSkipE2E: false,
    ignorableOnly: false,
    testOnlyChanges: false,
  };

  // prBaseRef mirrors eligibleLabelInput — the GitHub Actions entrypoint passes
  // the same base ref to both the path-filter and label-override stages.
  const androidOnlyPathFilters = {
    githubEventName: 'pull_request',
    prBaseRef: 'main',
    isFork: false,
    shouldSkipE2E: false,
    allChangesCount: 1,
    ignorableCount: 0,
    e2eTestFilesCount: 0,
    e2eTestOrIgnorableCount: 0,
    e2eWorkflowsCount: 0,
    androidCount: 1,
    iosCount: 0,
    androidOrIgnorableCount: 1,
    iosOrIgnorableCount: 0,
  };

  it('widens skip-smart-e2e-selection to both platforms on an Android-only PR', () => {
    const result = resolveE2EPlatformRequirements({
      pathFilterInput: androidOnlyPathFilters,
      labelOverrideInput: eligibleLabelInput,
      skipSmartSelection: true,
    });

    expect(result).toMatchObject({
      android: true,
      ios: true,
      e2eNeeded: true,
      useMainBuildsForTestOnlyPrs: false,
    });
  });

  it('enables the iOS platform on a main PR via skip-smart-e2e-selection', () => {
    const result = resolveE2EPlatformRequirements({
      pathFilterInput: {
        ...androidOnlyPathFilters,
        androidCount: 1,
        iosCount: 1,
        androidOrIgnorableCount: 1,
        iosOrIgnorableCount: 1,
      },
      labelOverrideInput: eligibleLabelInput,
      skipSmartSelection: true,
    });

    expect(result).toMatchObject({
      android: true,
      ios: true,
    });
  });

  it('does not enable the iOS build on a main PR when nothing requests iOS', () => {
    const result = resolveE2EPlatformRequirements({
      pathFilterInput: {
        ...androidOnlyPathFilters,
        androidCount: 1,
        iosCount: 1,
        androidOrIgnorableCount: 1,
        iosOrIgnorableCount: 1,
      },
      labelOverrideInput: eligibleLabelInput,
    });

    expect(result).toMatchObject({
      android: true,
      ios: false,
    });
  });

  it('enables the iOS platform on release/* PRs when skip-smart-e2e-selection is applied', () => {
    const result = resolveE2EPlatformRequirements({
      pathFilterInput: {
        ...androidOnlyPathFilters,
        prBaseRef: 'release/1.0.0',
        androidCount: 1,
        iosCount: 1,
        androidOrIgnorableCount: 1,
        iosOrIgnorableCount: 1,
      },
      labelOverrideInput: {
        ...eligibleLabelInput,
        prBaseRef: 'release/1.0.0',
      },
      skipSmartSelection: true,
    });

    expect(result).toMatchObject({
      android: true,
      ios: true,
    });
  });

  it('enables iOS on main PRs when smoke-infrastructure paths change', () => {
    const result = resolveE2EPlatformRequirements({
      pathFilterInput: androidOnlyPathFilters,
      labelOverrideInput: eligibleLabelInput,
      e2eSmokeInfraCount: 3,
    });

    expect(result).toMatchObject({
      android: true,
      ios: true,
    });
  });

  it('does not enable iOS from smoke-infrastructure paths on release/* PRs', () => {
    const result = resolveE2EPlatformRequirements({
      pathFilterInput: {
        ...androidOnlyPathFilters,
        prBaseRef: 'release/1.0.0',
      },
      labelOverrideInput: {
        ...eligibleLabelInput,
        prBaseRef: 'release/1.0.0',
      },
      e2eSmokeInfraCount: 3,
    });

    expect(result).toMatchObject({
      android: true,
      ios: false,
    });
  });

  it('does not revive E2E when skip-smart-e2e-selection is applied to an ignorable-only PR', () => {
    const result = resolveE2EPlatformRequirements({
      pathFilterInput: {
        ...androidOnlyPathFilters,
        androidCount: 0,
        androidOrIgnorableCount: 0,
        ignorableCount: 1,
        e2eTestOrIgnorableCount: 1,
      },
      labelOverrideInput: {
        ...eligibleLabelInput,
        ignorableOnly: true,
      },
      skipSmartSelection: true,
    });

    expect(result).toMatchObject({
      android: false,
      ios: false,
      e2eNeeded: false,
    });
  });
});
