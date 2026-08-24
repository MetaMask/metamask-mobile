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

  if (!isEligiblePullRequest || !runAppiumIosLabel || flags.ios) {
    return flags;
  }

  const ios = true;
  const e2eNeeded = flags.android || ios;

  return {
    ...flags,
    ios,
    e2eNeeded,
    nativeBuildNeeded: e2eNeeded && !testOnlyChanges,
    message: `${flags.message} + iOS build (run-appium-ios-tests label)`,
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
  const flags = applyE2ELabelOverrides(baseFlags, labelOverrideInput);
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
