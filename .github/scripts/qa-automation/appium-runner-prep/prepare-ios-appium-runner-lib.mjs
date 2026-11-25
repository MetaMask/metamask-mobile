/**
 * Pure fail-closed helpers for prepare-ios-appium-runner.mjs.
 * Kept free of Appium / simctl side effects so Jest can cover pool-mode gates.
 */

/**
 * @param {number} poolSize
 * @param {string | undefined} appPath
 */
export function assertPoolModeAppPath(poolSize, appPath) {
  if (poolSize > 1 && !appPath) {
    throw new Error('IOS_APP_PATH is required for iOS device pool mode.');
  }
}

/**
 * @param {number} poolSize
 * @param {unknown} wdaApp
 */
export function assertPoolModeWdaArtifacts(poolSize, wdaApp) {
  if (poolSize > 1 && !wdaApp) {
    throw new Error(
      'WDA artifacts are required for iOS device pool mode, but none were found.',
    );
  }
}

/**
 * @param {number} poolSize
 * @param {readonly string[]} installedWdaBundleIds
 * @returns {{ iosWdaPreinstalled: 'true' | 'false'; iosWdaBundleIdBase: string }}
 */
export function resolvePoolWdaPreinstallState(poolSize, installedWdaBundleIds) {
  if (poolSize > 1 && !installedWdaBundleIds.every(Boolean)) {
    throw new Error('WDA must be preinstalled on every iOS pool simulator.');
  }

  if (installedWdaBundleIds.every(Boolean) && installedWdaBundleIds.length > 0) {
    return {
      iosWdaPreinstalled: 'true',
      iosWdaBundleIdBase: installedWdaBundleIds[0] ?? '',
    };
  }

  return {
    iosWdaPreinstalled: 'false',
    iosWdaBundleIdBase: '',
  };
}

/**
 * @param {{
 *   primaryUdid: string;
 *   poolSize: number;
 *   udids: readonly string[];
 *   iosWdaPreinstalled: string;
 *   iosWdaBundleIdBase: string;
 * }} options
 * @returns {string}
 */
export function buildPrepareIosGithubOutput({
  primaryUdid,
  poolSize,
  udids,
  iosWdaPreinstalled,
  iosWdaBundleIdBase,
}) {
  let output = `ios-simulator-udid=${primaryUdid}\nios-wda-preinstalled=${iosWdaPreinstalled}\n`;
  if (poolSize > 1) {
    output += `ios-device-pool=${udids.join(',')}\n`;
  }
  if (iosWdaBundleIdBase) {
    output += `ios-wda-bundle-id=${iosWdaBundleIdBase}\n`;
  }
  return output;
}
