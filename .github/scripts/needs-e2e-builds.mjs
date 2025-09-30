import fs from 'node:fs';

/**
 * Convert a string to a boolean. Created to make sure the variables are 
 * evaluated properly.
 * @param {string} value - The string to convert
 * @returns {boolean} - The boolean value
 */
function isTrue(value) {
  return String(value).trim().toLowerCase() === 'true';
}

/**
 * These variables are set in the workflow file
 * @type {boolean}
 */
const hasAndroidChanges = isTrue(process.env.ANDROID);
const hasIosChanges = isTrue(process.env.IOS);
const hasSharedFilesChanges = isTrue(process.env.SHARED);
const hasIgnoreFiles = process.env.IGNORE_FILES || '';
const catchAllFiles = process.env.CATCH_ALL_FILES || '';
const shouldSkipE2E = isTrue(process.env.SHOULD_SKIP_E2E);
const githubEventName = process.env.GITHUB_EVENT_NAME;

function writeOutputs({ message, willBuildAndroid, willBuildIos, changedFiles }) {
  const willBuild = willBuildAndroid || willBuildIos ? 'true' : 'false';
  console.log(message);
  const outputs = [
    `android_final=${willBuildAndroid}`,
    `ios_final=${willBuildIos}`,
    `builds=${willBuild}`,
    `changed_files=${changedFiles}`,
  ].join('\n') + '\n';
  fs.appendFileSync(process.env.GITHUB_OUTPUT, outputs);
}

async function main() {
  /**
   * These variables are used to store the build outputs
   * @type {boolean}
   */
  let willBuildAndroid = false;
  let willBuildIos = false;
  let changedFiles = '';
  let message = '';

  // Guard: explicit skip
  if (shouldSkipE2E) {
    writeOutputs({
      message: 'Skipping E2E builds',
      willBuildAndroid: false,
      willBuildIos: false,
      changedFiles: '',
    });
    return;
  }

  // Determine the build outputs
  const hasChanges = Boolean(catchAllFiles && String(catchAllFiles).trim().length > 0);
  const isPureIgnore = Boolean(hasIgnoreFiles && hasIgnoreFiles === catchAllFiles);

  if (hasSharedFilesChanges) {
    message = 'Building both platforms (shared files changes)';
    willBuildAndroid = true;
    willBuildIos = true;
    changedFiles = catchAllFiles;
  } else if (!hasChanges) {
    message = 'Ignoring - no changes detected';
    changedFiles = '';
  } else if (isPureIgnore) {
    message = 'Ignoring - no mobile-impacting changes (pure ignore)';
    changedFiles = '';
  } else if (hasAndroidChanges || hasIosChanges) {
    if (hasAndroidChanges && hasIosChanges) {
      message = 'Building both platforms (mixed changes)';
      willBuildAndroid = true;
      willBuildIos = true;
    } else if (hasAndroidChanges) {
      message = 'Building Android only (mixed changes)';
      willBuildAndroid = true;
      willBuildIos = false;
    } else {
      message = 'Building iOS only (mixed changes)';
      willBuildAndroid = false;
      willBuildIos = true;
    }
    changedFiles = catchAllFiles;
  } else {
    // Conservative fallback: unclassified but non-ignored changes
    message = 'Building both platforms (unclassified changes)';
    willBuildAndroid = true;
    willBuildIos = true;
    changedFiles = catchAllFiles;
  }

  // On scheduled runs, do not emit changed files to avoid large payloads
  if (githubEventName === 'schedule') {
    changedFiles = '';
  }

  writeOutputs({
    message,
    willBuildAndroid,
    willBuildIos,
    changedFiles,
  });
}

main().catch((error) => {
  console.error('\n❌ Unexpected error:', error);
  process.exit(1);
});
