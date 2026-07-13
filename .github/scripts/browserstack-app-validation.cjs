/**
 * Validates BrowserStack API fields before they are written to GitHub Actions
 * outputs or other local files.
 */

/** BrowserStack app URLs use the bs:// scheme with an opaque app hash. */
const BROWSERSTACK_APP_URL_PATTERN = /^bs:\/\/[A-Za-z0-9]+$/;

const WITH_SRP_CUSTOM_ID_PATTERN =
  /^MetaMask-Android-With-SRP-[A-Za-z0-9._-]+-\d+$/;
const WITHOUT_SRP_CUSTOM_ID_PATTERN =
  /^MetaMask-Android-Without-SRP-[A-Za-z0-9._-]+-\d+$/;

const MAIN_BRANCH_BROWSERSTACK_SLUG = 'main';
const MAIN_WITH_SRP_CUSTOM_ID_PREFIX = `MetaMask-Android-With-SRP-${MAIN_BRANCH_BROWSERSTACK_SLUG}-`;
const MAIN_WITHOUT_SRP_CUSTOM_ID_PREFIX = `MetaMask-Android-Without-SRP-${MAIN_BRANCH_BROWSERSTACK_SLUG}-`;

/**
 * @param {unknown} value
 * @param {RegExp} pattern
 * @param {string} label
 * @returns {string}
 */
function assertMatchesPattern(value, pattern, label) {
  if (typeof value !== 'string' || !pattern.test(value)) {
    throw new Error(`Invalid ${label}`);
  }
  return value;
}

/**
 * @param {unknown} value
 * @param {string} label
 * @returns {string}
 */
function assertBrowserStackAppUrl(value, label) {
  return assertMatchesPattern(value, BROWSERSTACK_APP_URL_PATTERN, label);
}

/**
 * @param {unknown} value
 * @param {'with-srp' | 'without-srp'} kind
 * @returns {string}
 */
function assertBrowserStackCustomId(value, kind) {
  const pattern =
    kind === 'with-srp'
      ? WITH_SRP_CUSTOM_ID_PATTERN
      : WITHOUT_SRP_CUSTOM_ID_PATTERN;
  return assertMatchesPattern(value, pattern, `${kind} custom_id`);
}

/**
 * @param {string} path
 * @param {Record<string, string>} outputs
 */
function writeGithubOutputs(path, outputs) {
  const lines = [];
  for (const [key, value] of Object.entries(outputs)) {
    if (value.includes('\n') || value.includes('\r')) {
      throw new Error(`Refusing to write multiline GitHub output for ${key}`);
    }
    lines.push(`${key}=${value}`);
  }
  require('node:fs').appendFileSync(path, `${lines.join('\n')}\n`);
}

module.exports = {
  BROWSERSTACK_APP_URL_PATTERN,
  WITH_SRP_CUSTOM_ID_PATTERN,
  WITHOUT_SRP_CUSTOM_ID_PATTERN,
  MAIN_BRANCH_BROWSERSTACK_SLUG,
  MAIN_WITH_SRP_CUSTOM_ID_PREFIX,
  MAIN_WITHOUT_SRP_CUSTOM_ID_PREFIX,
  assertBrowserStackAppUrl,
  assertBrowserStackCustomId,
  writeGithubOutputs,
};
