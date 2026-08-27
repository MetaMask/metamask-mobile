/**
 * Pure decision logic for CI E2E platform and native-build requirements.
 */

/**
 * @param {object} input
 * @returns {object}
 */
function computeE2EPlatformFlags(input) {
  const {
    githubEventName,
    prBaseRef = '',
    isFork,
    shouldSkipE2E,
    allChangesCount,
    ignorableCount,
    e2eTestFilesCount,
    e2eTestOrIgnorableCount,
    e2eWorkflowsCount,
    androidCount,
    iosCount,
    androidOrIgnorableCount,
    iosOrIgnorableCount,
    changedSpecFiles = '',
  } = input;

  let android = false;
  let ios = false;
  let changed = '';
  let message = '';
  let nativeBuildNeeded = true;

  const ignorableOnly =
    allChangesCount > 0 &&
    ignorableCount === allChangesCount &&
    e2eWorkflowsCount === 0;

  const testOnlyChanges =
    allChangesCount > 0 &&
    e2eTestOrIgnorableCount >= allChangesCount &&
    e2eTestFilesCount > 0 &&
    e2eWorkflowsCount === 0;

  const isStableTarget =
    githubEventName === 'pull_request' && prBaseRef === 'stable';

  // Feature-branch PRs into main do not build iOS from path filters alone. Two
  // labels opt back in — see applyE2ELabelOverrides. Pushes to main/release/*,
  // the nightly schedule, and PRs into release/* are unaffected, so iOS
  // regressions are still caught before a release is cut.
  const isMainTargetPullRequest =
    githubEventName === 'pull_request' && prBaseRef === 'main';

  if (isStableTarget) {
    message = 'Skipping E2E (stable branch synchronization PR)';
  } else if (githubEventName === 'schedule' || githubEventName === 'push') {
    message =
      'E2E for both platforms (scheduled or push to main/release/*)';
    android = true;
    ios = true;
  } else if (githubEventName === 'merge_group') {
    message = 'Skipping E2E (merge queue)';
  } else if (isFork) {
    message = 'Skipping E2E (fork PR)';
  } else if (shouldSkipE2E) {
    message = 'Skipping E2E (skip signal)';
  } else if (ignorableOnly) {
    message = 'Skipping E2E (ignorable-only changes)';
  } else if (testOnlyChanges) {
    message =
      'E2E for both platforms (test-only changes — reuse main native builds)';
    android = true;
    ios = true;
    nativeBuildNeeded = false;
    changed = changedSpecFiles;
  } else if (
    androidCount > 0 &&
    iosCount === 0 &&
    e2eWorkflowsCount === 0 &&
    androidOrIgnorableCount >= allChangesCount
  ) {
    message = 'E2E Android only';
    android = true;
    changed = changedSpecFiles;
  } else if (
    iosCount > 0 &&
    androidCount === 0 &&
    e2eWorkflowsCount === 0 &&
    iosOrIgnorableCount >= allChangesCount
  ) {
    message = 'E2E iOS only';
    ios = true;
    changed = changedSpecFiles;
  } else {
    message = 'E2E for both platforms';
    android = true;
    ios = true;
    changed = changedSpecFiles;
  }

  // Preserved so the skip-smart-e2e-selection opt-in can stay non-widening: it
  // must know whether iOS was selected by path filters before the suppression
  // below erased it.
  const iosByPathFilters = ios;

  if (isMainTargetPullRequest && ios) {
    ios = false;
    message = `${message} — iOS not requested for a PR into main (add run-appium-ios-tests or skip-smart-e2e-selection)`;
  }

  const e2eNeeded = android || ios;

  const runSmartE2ESelection =
    githubEventName === 'pull_request' &&
    e2eNeeded &&
    !isFork &&
    !shouldSkipE2E;

  return {
    android,
    ios,
    iosByPathFilters,
    e2eNeeded,
    nativeBuildNeeded: e2eNeeded ? nativeBuildNeeded : false,
    runSmartE2ESelection,
    message,
    changedSpecFiles: changed,
  };
}

/**
 * Apply PR label overrides on top of path-filter platform flags.
 * Labels must not bypass ignorable-only or hard E2E skip signals.
 *
 * @param {object} flags
 * @param {object} input
 * @returns {object}
 */
function applyE2ELabelOverrides(flags, input) {
  const {
    runAppiumIosLabel = false,
    skipSmartSelection = false,
    githubEventName,
    prBaseRef = '',
    isFork,
    shouldSkipE2E,
    ignorableOnly,
    testOnlyChanges,
  } = input;

  const isEligiblePullRequest =
    githubEventName === 'pull_request' &&
    prBaseRef !== 'stable' &&
    !isFork &&
    !shouldSkipE2E &&
    !ignorableOnly;

  // Two ways to request iOS. `run-appium-ios-tests` widens to iOS regardless of
  // path filters — that is its whole purpose. `skip-smart-e2e-selection` runs the
  // full ALL tag set on the platforms path filters already selected, so it opts
  // into iOS only when iOS was one of them; it must not add a platform the path
  // filters deliberately skipped.
  let reason = null;
  if (runAppiumIosLabel) {
    reason = 'run-appium-ios-tests label';
  } else if (skipSmartSelection && flags.iosByPathFilters) {
    reason = 'skip-smart-e2e-selection label';
  }

  if (!isEligiblePullRequest || !reason || flags.ios) {
    return flags;
  }

  const ios = true;
  const e2eNeeded = flags.android || ios;

  return {
    ...flags,
    ios,
    e2eNeeded,
    nativeBuildNeeded: e2eNeeded && !testOnlyChanges,
    // An iOS-only PR into main is suppressed down to no platforms at all, which
    // turns Smart E2E Selection off. Restoring iOS has to restore it too — and
    // isEligiblePullRequest already guarantees every other conjunct here.
    runSmartE2ESelection: true,
    message: `${flags.message} + iOS build (${reason})`,
  };
}

/**
 * Resolve whether Appium iOS smoke should run on a PR after path filters and
 * label overrides have determined platform flags.
 *
 * @param {object} flags
 * @param {object} input
 * @returns {boolean}
 */
function resolveRunAppiumIos(flags, input) {
  const {
    skipSmartSelection = false,
    runAppiumIosLabel = false,
    e2eSmokeInfraCount = 0,
    githubEventName,
    prBaseRef = '',
    isFork,
  } = input;

  if (
    githubEventName !== 'pull_request' ||
    prBaseRef === 'stable' ||
    isFork
  ) {
    return false;
  }

  // No iOS app, nothing to run smoke against. Keeps the flag from advertising a
  // run that cannot happen, and upholds the "only build when iOS E2E will run"
  // invariant from the other side: on PRs into main, ios and runAppiumIos are
  // driven by the same two opt-ins, so they are always equal.
  if (!flags.ios) {
    return false;
  }

  if (runAppiumIosLabel) {
    return true;
  }

  if (skipSmartSelection && flags.ios) {
    return true;
  }

  return e2eSmokeInfraCount > 0;
}

/**
 * Resolve final E2E platform flags and Appium iOS smoke eligibility for CI.
 *
 * @param {object} input
 * @returns {object}
 */
function resolveE2EPlatformRequirements(input) {
  const {
    pathFilterInput,
    labelOverrideInput,
    skipSmartSelection = false,
    e2eSmokeInfraCount = 0,
  } = input;

  const baseFlags = computeE2EPlatformFlags(pathFilterInput);
  const flags = applyE2ELabelOverrides(baseFlags, {
    ...labelOverrideInput,
    skipSmartSelection,
  });
  const runAppiumIos = resolveRunAppiumIos(flags, {
    skipSmartSelection,
    runAppiumIosLabel: labelOverrideInput.runAppiumIosLabel,
    e2eSmokeInfraCount,
    githubEventName: labelOverrideInput.githubEventName,
    prBaseRef: labelOverrideInput.prBaseRef,
    isFork: labelOverrideInput.isFork,
  });

  return {
    ...flags,
    runAppiumIos,
  };
}

module.exports = {
  computeE2EPlatformFlags,
  applyE2ELabelOverrides,
  resolveRunAppiumIos,
  resolveE2EPlatformRequirements,
};
