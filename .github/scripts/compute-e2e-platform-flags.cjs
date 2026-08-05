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

  if (githubEventName === 'schedule' || githubEventName === 'push') {
    // Push only fires for main and stable (ci.yml `on.push.branches`); release/*
    // branches never push-trigger CI. Treat stable pushes the same as main —
    // infrequent, but a full run helps trace stable-sync failures.
    message = 'E2E for both platforms (scheduled, or push to main/stable)';
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

  // stable is a long-lived branch merged from release/* only (never cherry-picked
  // into directly in the normal flow); PRs targeting it should get the full E2E
  // suite via the existing ALL fallback rather than AI-selected tags. release/*
  // targets (cherry-pick PRs) still use Smart E2E selection normally.
  const isStableTarget = prBaseRef === 'stable';

  const runSmartE2ESelection =
    githubEventName === 'pull_request' &&
    e2eNeeded &&
    !isFork &&
    !shouldSkipE2E &&
    !isStableTarget;

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
};
