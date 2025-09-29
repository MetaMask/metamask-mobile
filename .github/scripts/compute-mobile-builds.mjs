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


/**
 * These variables are used to store the build outputs
 * @type {boolean}
 */
let willBuildAndroid = false;
let willBuildIos = false;
let message = '';

/**
 * Determine the build outputs
 */
if (hasSharedFilesChanges) {
    message = 'Building both platforms (shared files changes)';
    willBuildAndroid = true;
    willBuildIos = true;
} else if (!catchAllFiles || hasIgnoreFiles === catchAllFiles) {
  message = 'Ignoring - no mobile-impacting changes (pure ignore)';
  willBuildAndroid = false;
  willBuildIos = false;
} else {
  message = 'Building both platforms (mixed changes)';
  willBuildAndroid = hasAndroidChanges;
  willBuildIos = hasIosChanges;
}

/**
 * Aggregate the build outputs
 * @type {boolean}
 */
const willBuild = willBuildAndroid || willBuildIos ? 'true' : 'false';

console.log(message);

/**
 * Output the build outputs
 * @type {string}
 */
const outputs = [
  `android_final=${willBuildAndroid}`,
  `ios_final=${willBuildIos}`,
  `builds=${willBuild}`,
].join('\n') + '\n';

/**
 * Append the build outputs to the GitHub output
 */
fs.appendFileSync(process.env.GITHUB_OUTPUT, outputs);


