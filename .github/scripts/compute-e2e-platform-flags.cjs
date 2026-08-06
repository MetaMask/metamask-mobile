/**
 * Pure decision logic for CI E2E platform and native-build requirements.
 */

/**
 * Android-first gate for whether Build iOS Apps should run.
 * Feature PRs to main skip iOS when Android also runs, unless opted in.
 *
 * @param {object} input
 * @returns {boolean}
 */
function shouldBuildIosApps(input) {
  const {
    githubEventName,
    pullRequestBase = '',
    iosE2eNeeded,
    androidE2eNeeded,
    iosPathChanges = false,
    forceIosE2E = false,
    runAppiumIos = false,
  } = input;

  if (!iosE2eNeeded) {
    return false;
  }

  if (githubEventName !== 'pull_request') {
    return true;
  }

  if (pullRequestBase !== 'main') {
    return true;
  }

  if (!androidE2eNeeded) {
    return true;
  }

  return iosPathChanges || forceIosE2E || runAppiumIos;
}

/**
 * @param {object} input
 * @returns {object}
 */
function computeE2EPlatformFlags(input) {
  const {
    githubEventName,
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

  if (githubEventName === 'schedule' || githubEventName === 'push') {
    message = 'E2E for both platforms (scheduled or push to main)';
    android = true;
    ios = true;
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

  // Merge queue: Android already ran on the PR. Keep iOS only when path logic selected it.
  if (githubEventName === 'merge_group' && (android || ios)) {
    android = false;
    if (ios) {
      message = nativeBuildNeeded
        ? 'E2E iOS only (merge queue)'
        : 'E2E iOS only (merge queue — reuse main native builds)';
    } else {
      message = 'Skipping E2E (merge queue — Android covered on PR)';
    }
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

module.exports = {
  computeE2EPlatformFlags,
  shouldBuildIosApps,
};
