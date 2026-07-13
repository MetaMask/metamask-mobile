/**
 * Pure decision logic for CI E2E platform and native-build requirements.
 */

export interface E2EPlatformFlagsInput {
  githubEventName: string;
  isFork: boolean;
  shouldSkipE2E: boolean;
  allChangesCount: number;
  ignorableCount: number;
  e2eTestFilesCount: number;
  e2eTestOrIgnorableCount: number;
  e2eWorkflowsCount: number;
  androidCount: number;
  iosCount: number;
  androidOrIgnorableCount: number;
  iosOrIgnorableCount: number;
  allChangesFiles?: string;
}

export interface E2EPlatformFlagsResult {
  android: boolean;
  ios: boolean;
  e2eNeeded: boolean;
  nativeBuildNeeded: boolean;
  runSmartE2ESelection: boolean;
  message: string;
  changedFiles: string;
}

export function computeE2EPlatformFlags(
  input: E2EPlatformFlagsInput,
): E2EPlatformFlagsResult {
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
    allChangesFiles = '',
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
    changed = allChangesFiles;
  } else if (
    androidCount > 0 &&
    iosCount === 0 &&
    e2eWorkflowsCount === 0 &&
    androidOrIgnorableCount >= allChangesCount
  ) {
    message = 'E2E Android only';
    android = true;
    changed = allChangesFiles;
  } else if (
    iosCount > 0 &&
    androidCount === 0 &&
    e2eWorkflowsCount === 0 &&
    iosOrIgnorableCount >= allChangesCount
  ) {
    message = 'E2E iOS only';
    ios = true;
    changed = allChangesFiles;
  } else {
    message = 'E2E for both platforms';
    android = true;
    ios = true;
    changed = allChangesFiles;
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
    changedFiles: changed,
  };
}
