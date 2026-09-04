#!/usr/bin/env node
/* eslint-disable import-x/no-nodejs-modules */
/**
 * Prepares the iOS Appium runner before Playwright tests:
 * 1. Boot the simulator pool (N=1 uses the base sim; N>1 clones + boots in parallel)
 * 2. Post-boot settle (SpringBoard / system UI — mirrors Android emulator settle)
 * 3. Prebuild WDA into ~/appium-wda on cache miss (once, using the primary UDID)
 * 4. Per simulator: simctl install WebDriverAgentRunner + MetaMask.app
 *    (sequential per UDID; parallel across UDIDs in pool mode)
 * 5. Grant common simulator permissions + warm-launch MetaMask (once per simulator)
 * 6. Warm WDA via throwaway Appium session(s); leaves Appium running for tests
 *    (sequential across pool UDIDs to avoid shared-server races)
 *
 * Sets GITHUB_OUTPUT: ios-simulator-udid, ios-wda-preinstalled, ios-wda-bundle-id.
 * Pool mode also sets ios-device-pool and fails closed on WDA preparation.
 */
import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync } from 'node:fs';
import {
  grantIosAppPermissions,
  installIosApp,
  parseIosDevicePoolSize,
  prepareIosSimulatorPool,
  warmLaunchIosApp,
} from './ios-simulator-lib.mjs';
import {
  assertPoolModeAppPath,
  assertPoolModeWdaArtifacts,
  buildPrepareIosGithubOutput,
  resolvePoolWdaPreinstallState,
} from './prepare-ios-appium-runner-lib.mjs';
import {
  ensureWdaPrebuilt,
  findWdaArtifacts,
  getDerivedDataPath,
  hasUsableWdaArtifacts,
  installWdaOnSimulator,
  toWdaBundleIdBase,
} from './wda-lib.mjs';
import {
  warmUpIosAppiumWda,
  warmUpIosAppiumWdaSequentially,
} from './warm-up-ios-appium-wda.mjs';

const simulatorName = process.env.IOS_SIMULATOR_NAME ?? 'iPhone 16 Pro';
const appPath = process.env.IOS_APP_PATH;
const bundleId = process.env.IOS_BUNDLE_ID ?? 'io.metamask.MetaMask';
const skipWdaPrebuild = process.env.SKIP_WDA_PREBUILD === 'true';
const poolSize = parseIosDevicePoolSize(process.env.IOS_DEVICE_POOL_SIZE);

spawnSync(
  'defaults',
  ['write', 'com.apple.iphonesimulator', 'SlowAnimations', '-bool', 'false'],
  { stdio: 'inherit' },
);

console.log('Preparing iOS Appium runner (sim pool → WDA prebuild)…');

const udids = await prepareIosSimulatorPool({
  baseName: simulatorName,
  poolSize,
});
const primaryUdid = udids[0];

if (skipWdaPrebuild) {
  console.log('SKIP_WDA_PREBUILD=true — skipping WDA prebuild');
} else {
  await ensureWdaPrebuilt({ udid: primaryUdid, simulatorName });
}

if (appPath && !existsSync(appPath)) {
  console.error(`IOS_APP_PATH does not exist: ${appPath}`);
  process.exit(1);
}
assertPoolModeAppPath(poolSize, appPath);

let wdaApp;

if (hasUsableWdaArtifacts()) {
  ({ wdaApp } = findWdaArtifacts(getDerivedDataPath()));
}

assertPoolModeWdaArtifacts(poolSize, wdaApp);

/**
 * WDA and app installs stay sequential per simulator. Different simulators are
 * prepared in parallel in pool mode.
 *
 * @param {string} udid
 * @returns {Promise<string>} WDA bundle ID base, or empty for legacy fallback
 */
async function prepareSimulator(udid) {
  let wdaBundleIdBase = '';

  if (wdaApp) {
    try {
      const installedBundleId = await installWdaOnSimulator({ udid, wdaApp });
      wdaBundleIdBase = toWdaBundleIdBase(installedBundleId);
    } catch (error) {
      if (poolSize > 1) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      console.warn(
        `WDA simctl install failed — tests will use xcodebuild path: ${message}`,
      );
    }
  }

  if (appPath) {
    await installIosApp({ udid, bundleId, appPath });
    await grantIosAppPermissions({ udid, bundleId });
    await warmLaunchIosApp({ udid, bundleId });
  }

  return wdaBundleIdBase;
}

if (!wdaApp) {
  console.log(
    'WDA artifacts not found — skipping sim WDA install (tests will use xcodebuild).',
  );
}

const installedWdaBundleIds =
  poolSize > 1
    ? await (async () => {
        const results = await Promise.allSettled(
          udids.map((udid) => prepareSimulator(udid)),
        );
        const failures = results.filter((result) => result.status === 'rejected');
        if (failures.length > 0) {
          const messages = failures.map((result) =>
            result.reason instanceof Error
              ? result.reason.message
              : String(result.reason),
          );
          throw new Error(
            `Failed to prepare ${failures.length}/${udids.length} iOS pool simulator(s): ${messages.join('; ')}`,
          );
        }
        return results.map((result) =>
          result.status === 'fulfilled' ? result.value : '',
        );
      })()
    : [await prepareSimulator(primaryUdid)];

const { iosWdaPreinstalled, iosWdaBundleIdBase } =
  resolvePoolWdaPreinstallState(poolSize, installedWdaBundleIds);

if (iosWdaPreinstalled === 'true' && iosWdaBundleIdBase) {
  if (poolSize > 1) {
    await warmUpIosAppiumWdaSequentially({
      udids,
      wdaBundleIdBase: iosWdaBundleIdBase,
      simulatorName,
    });
  } else {
    try {
      await warmUpIosAppiumWda({
        udid: primaryUdid,
        wdaBundleIdBase: iosWdaBundleIdBase,
        simulatorName,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(
        `WDA warm-up failed — prepare continues; first Playwright session will launch WDA: ${message}`,
      );
    }
  }
}

console.log(`IOS_SIMULATOR_UDID=${primaryUdid}`);
if (iosWdaPreinstalled === 'true') {
  console.log(`IOS_WDA_PREINSTALLED=true`);
  console.log(`IOS_WDA_BUNDLE_ID=${iosWdaBundleIdBase}`);
}

if (process.env.GITHUB_OUTPUT) {
  appendFileSync(
    process.env.GITHUB_OUTPUT,
    buildPrepareIosGithubOutput({
      primaryUdid,
      poolSize,
      udids,
      iosWdaPreinstalled,
      iosWdaBundleIdBase,
    }),
  );
}

console.log('iOS Appium runner ready.');

// Detached Appium + WebdriverIO can leave open handles; exit so GHA does not hang.
process.exit(0);
