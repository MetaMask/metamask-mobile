#!/usr/bin/env node
/* eslint-disable import-x/no-nodejs-modules */
/**
 * Prepares the iOS Appium runner before Playwright tests:
 * 1. Boot simulator (must complete before WDA prebuild so xcodebuild has a destination)
 * 2. Post-boot settle (SpringBoard / system UI — mirrors Android emulator settle)
 * 3. Prebuild WDA into ~/appium-wda on cache miss
 * 4. simctl install WebDriverAgentRunner + MetaMask.app (sequential — same UDID)
 * 5. Grant common simulator permissions + warm-launch MetaMask once
 * 6. Warm WDA via a throwaway Appium session; leaves Appium running for tests
 *
 * Sets GITHUB_OUTPUT: ios-simulator-udid, ios-wda-preinstalled, ios-wda-bundle-id.
 * WDA simctl install failures fall back to the xcodebuild path in tests.
 */
import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync } from 'node:fs';
import {
  bootIosSimulator,
  grantIosAppPermissions,
  installIosApp,
  warmLaunchIosApp,
} from './ios-simulator-lib.mjs';
import {
  ensureWdaPrebuilt,
  findWdaArtifacts,
  getDerivedDataPath,
  hasUsableWdaArtifacts,
  installWdaOnSimulator,
  toWdaBundleIdBase,
} from './wda-lib.mjs';
import { warmUpIosAppiumWda } from './warm-up-ios-appium-wda.mjs';

const simulatorName = process.env.IOS_SIMULATOR_NAME ?? 'iPhone 16 Pro';
const appPath = process.env.IOS_APP_PATH;
const bundleId = process.env.IOS_BUNDLE_ID ?? 'io.metamask.MetaMask';
const skipWdaPrebuild = process.env.SKIP_WDA_PREBUILD === 'true';

spawnSync(
  'defaults',
  ['write', 'com.apple.iphonesimulator', 'SlowAnimations', '-bool', 'false'],
  { stdio: 'inherit' },
);

console.log('Preparing iOS Appium runner (sim boot → WDA prebuild)…');

const udid = await bootIosSimulator(simulatorName);

if (skipWdaPrebuild) {
  console.log('SKIP_WDA_PREBUILD=true — skipping WDA prebuild');
} else {
  await ensureWdaPrebuilt({ udid, simulatorName });
}

if (appPath && !existsSync(appPath)) {
  console.error(`IOS_APP_PATH does not exist: ${appPath}`);
  process.exit(1);
}

let iosWdaPreinstalled = 'false';
let iosWdaBundleIdBase = '';

// simctl install must be sequential on the same UDID — parallel WDA + app installs race.
if (hasUsableWdaArtifacts()) {
  const { wdaApp } = findWdaArtifacts(getDerivedDataPath());
  if (wdaApp) {
    try {
      const installedBundleId = await installWdaOnSimulator({ udid, wdaApp });
      iosWdaPreinstalled = 'true';
      iosWdaBundleIdBase = toWdaBundleIdBase(installedBundleId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(
        `WDA simctl install failed — tests will use xcodebuild path: ${message}`,
      );
    }
  }
} else {
  console.log(
    'WDA artifacts not found — skipping sim WDA install (tests will use xcodebuild).',
  );
}

if (appPath) {
  await installIosApp({ udid, bundleId, appPath });
  await grantIosAppPermissions({ udid, bundleId });
  await warmLaunchIosApp({ udid, bundleId });
}

if (iosWdaPreinstalled === 'true' && iosWdaBundleIdBase) {
  try {
    await warmUpIosAppiumWda({
      udid,
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

console.log(`IOS_SIMULATOR_UDID=${udid}`);
if (iosWdaPreinstalled === 'true') {
  console.log(`IOS_WDA_PREINSTALLED=true`);
  console.log(`IOS_WDA_BUNDLE_ID=${iosWdaBundleIdBase}`);
}

if (process.env.GITHUB_OUTPUT) {
  appendFileSync(
    process.env.GITHUB_OUTPUT,
    `ios-simulator-udid=${udid}\nios-wda-preinstalled=${iosWdaPreinstalled}\n`,
  );
  if (iosWdaBundleIdBase) {
    appendFileSync(
      process.env.GITHUB_OUTPUT,
      `ios-wda-bundle-id=${iosWdaBundleIdBase}\n`,
    );
  }
}

console.log('iOS Appium runner ready.');

// Detached Appium + WebdriverIO can leave open handles; exit so GHA does not hang.
process.exit(0);
