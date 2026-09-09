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
  let useMainBuildsForTestOnlyPrs = false;

  const { ignorableOnly, testOnlyChanges } = classifyE2EChanges(input);

  const isStableTarget =
    githubEventName === 'pull_request' && prBaseRef === 'stable';

  // PRs into main/release/* do not build iOS from path filters alone. Two
  // labels opt back in — see applyE2ELabelOverrides.
  const isIOSRequestOnlyPullRequest =
    githubEventName === 'pull_request' &&
    (prBaseRef === 'main' || prBaseRef.startsWith('release/'));

  if (isStableTarget) {
    message = 'Skipping E2E (stable branch synchronization PR)';
  } else if (githubEventName === 'schedule') {
    message = 'E2E for both platforms (scheduled)';
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
    const isPullRequest = githubEventName === 'pull_request';
    message = isPullRequest
      ? 'E2E for both platforms (test-only changes — reuse main native builds)'
      : 'E2E for both platforms (test-only changes)';
    android = true;
    ios = true;
    useMainBuildsForTestOnlyPrs = isPullRequest;
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

  if (isIOSRequestOnlyPullRequest && ios) {
    ios = false;
    message = `${message} — iOS not requested for this PR (add run-appium-ios-tests or skip-smart-e2e-selection)`;
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
    e2eNeeded,
    useMainBuildsForTestOnlyPrs: e2eNeeded ? useMainBuildsForTestOnlyPrs : false,
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
    e2eSmokeInfraCount = 0,
  } = input;

  const isEligiblePullRequest =
    githubEventName === 'pull_request' &&
    prBaseRef !== 'stable' &&
    !isFork &&
    !shouldSkipE2E &&
    !ignorableOnly;

  const isMainTargetPullRequest =
    githubEventName === 'pull_request' && prBaseRef === 'main';
  const smokeInfraRequest =
    isMainTargetPullRequest && e2eSmokeInfraCount > 0;

  // `run-appium-ios-tests` requests iOS. `skip-smart-e2e-selection` widens an
  // eligible PR to both platforms while selecting the full ALL tag set. Shared
  // smoke infrastructure requests both platforms on main PRs.
  let reason = null;
  if (runAppiumIosLabel) {
    reason = 'run-appium-ios-tests label';
  } else if (skipSmartSelection) {
    reason = 'skip-smart-e2e-selection label';
  } else if (smokeInfraRequest) {
    reason = 'e2e smoke infrastructure changes';
  }

  const widenToBothPlatforms = skipSmartSelection || smokeInfraRequest;

  if (
    !isEligiblePullRequest ||
    !reason ||
    (flags.ios && (!widenToBothPlatforms || flags.android))
  ) {
    return flags;
  }

  const ios = true;
  const android = widenToBothPlatforms || flags.android;
  const e2eNeeded = android || ios;

  return {
    ...flags,
    android,
    ios,
    e2eNeeded,
    useMainBuildsForTestOnlyPrs: e2eNeeded && testOnlyChanges,
    // A platform override can restore E2E after request-only PR suppression.
    runSmartE2ESelection: true,
    message: `${flags.message} + platform override (${reason})`,
  };
}

/**
 * Resolve final E2E platform flags for CI.
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
    e2eSmokeInfraCount,
  });

  return flags;
}

/**
 * @param {object} input
 * @returns {{ ignorableOnly: boolean, testOnlyChanges: boolean }}
 */
function classifyE2EChanges(input) {
  const {
    allChangesCount,
    ignorableCount,
    e2eTestFilesCount,
    e2eTestOrIgnorableCount,
    e2eWorkflowsCount,
  } = input;

  return {
    ignorableOnly:
      allChangesCount > 0 &&
      ignorableCount === allChangesCount &&
      e2eWorkflowsCount === 0,
    testOnlyChanges:
      allChangesCount > 0 &&
      e2eTestOrIgnorableCount >= allChangesCount &&
      e2eTestFilesCount > 0 &&
      e2eWorkflowsCount === 0,
  };
}

export {
  computeE2EPlatformFlags,
  applyE2ELabelOverrides,
  resolveE2EPlatformRequirements,
  classifyE2EChanges,
};
