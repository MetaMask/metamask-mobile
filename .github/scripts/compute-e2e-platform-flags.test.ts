const {
  computeE2EPlatformFlags,
  applyE2ELabelOverrides,
  resolveE2EPlatformRequirements,
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
    expect(result.nativeBuildNeeded).toBe(true);
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
      nativeBuildNeeded: true,
    });
    expect(result.message).toContain('iOS not requested for a PR into main');
    // Path filters selected iOS; only the main-PR rule removed it. The opt-ins
    // rely on this being preserved.
    expect(result.iosByPathFilters).toBe(true);
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
      nativeBuildNeeded: false,
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
      nativeBuildNeeded: false,
      runSmartE2ESelection: false,
    });
  });

  it('still builds iOS for cherry-pick PRs targeting release/*', () => {
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
      ios: true,
      e2eNeeded: true,
    });
    expect(result.message).not.toContain('iOS build disabled');
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
      nativeBuildNeeded: true,
      message: expect.stringContaining('run-appium-ios-tests'),
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

  it('keeps skip-smart-e2e-selection non-widening on an Android-only PR into main', () => {
    const baseFlags = computeE2EPlatformFlags(androidOnlyPathFiltersFor('main'));

    const result = applyE2ELabelOverrides(baseFlags, {
      ...overrideInput,
      runAppiumIosLabel: false,
      skipSmartSelection: true,
    });

    // Path filters deliberately skipped iOS, so the ALL-tags label must not add
    // the platform back.
    expect(result).toMatchObject({ android: true, ios: false, e2eNeeded: true });
    expect(result.message).not.toContain('skip-smart-e2e-selection');
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
      nativeBuildNeeded: true,
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
      nativeBuildNeeded: true,
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

  it('does not widen platforms when skip-smart-e2e-selection is applied to an Android-only PR', () => {
    const result = resolveE2EPlatformRequirements({
      pathFilterInput: androidOnlyPathFilters,
      labelOverrideInput: eligibleLabelInput,
      skipSmartSelection: true,
    });

    expect(result).toMatchObject({
      android: true,
      ios: false,
      e2eNeeded: true,
      nativeBuildNeeded: true,
      runAppiumIos: false,
    });
  });

  it('enables the iOS build and Appium iOS smoke on a main PR via skip-smart-e2e-selection', () => {
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
      runAppiumIos: true,
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
      runAppiumIos: false,
    });
  });

  // Stakeholder constraint: never build the iOS app unless iOS E2E will run.
  // On PRs into main both are driven by the same two opt-ins, so they must be
  // equal in every combination.
  it.each([
    ['nothing requested', { runAppiumIosLabel: false, skipSmartSelection: false, iosCount: 1 }],
    ['run-appium-ios-tests', { runAppiumIosLabel: true, skipSmartSelection: false, iosCount: 1 }],
    ['skip-smart-e2e-selection with iOS paths', { runAppiumIosLabel: false, skipSmartSelection: true, iosCount: 1 }],
    ['skip-smart-e2e-selection without iOS paths', { runAppiumIosLabel: false, skipSmartSelection: true, iosCount: 0 }],
    ['label on an Android-only PR', { runAppiumIosLabel: true, skipSmartSelection: false, iosCount: 0 }],
    ['smoke-infra changes only', { runAppiumIosLabel: false, skipSmartSelection: false, iosCount: 1, e2eSmokeInfraCount: 4 }],
  ])(
    'keeps the iOS build and Appium iOS run in lockstep on a main PR (%s)',
    (_label, { runAppiumIosLabel, skipSmartSelection, iosCount, e2eSmokeInfraCount = 0 }) => {
      const result = resolveE2EPlatformRequirements({
        pathFilterInput: {
          ...androidOnlyPathFilters,
          iosCount,
          iosOrIgnorableCount: iosCount,
        },
        labelOverrideInput: { ...eligibleLabelInput, runAppiumIosLabel },
        skipSmartSelection,
        e2eSmokeInfraCount,
      });

      expect(result.ios).toBe(result.runAppiumIos);
    },
  );

  it('enables Appium iOS smoke on release/* PRs when skip-smart-e2e-selection is applied and path filters require iOS', () => {
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
      runAppiumIos: true,
    });
  });

  it('suppresses Appium iOS smoke from smoke-infra changes on PRs targeting main', () => {
    const result = resolveE2EPlatformRequirements({
      pathFilterInput: androidOnlyPathFilters,
      labelOverrideInput: eligibleLabelInput,
      e2eSmokeInfraCount: 3,
    });

    expect(result).toMatchObject({
      android: true,
      ios: false,
      runAppiumIos: false,
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
      runAppiumIos: false,
    });
  });
});
