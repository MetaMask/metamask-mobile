#!/usr/bin/env node
/* eslint-disable import-x/no-nodejs-modules */
/**
 * Prepares the iOS Appium runner before Playwright tests:
 * - Boots the simulator (critical — job fails if this fails)
 * - Prebuilds WDA (critical on cache miss — job fails if this fails)
 * - Installs prebuilt WDA + MetaMask .app via simctl (app install critical;
 *   WDA simctl install is best-effort — tests fall back to xcodebuild)
 * - Warms up WDA via a throwaway Appium session (best-effort — job continues)
 *
 * Simulator boot and WDA prebuild run in parallel to shave wall-clock time on
 * cache miss (WDA ~8 min, sim boot ~1–2 min → overlap saves ~1–2 min).
 */
import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync } from 'node:fs';
import { bootIosSimulator, installIosApp } from './ios-simulator-lib.mjs';
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

console.log('Preparing iOS Appium runner (sim boot ∥ WDA prebuild)…');

const [udid] = await Promise.all([
  bootIosSimulator(simulatorName),
  skipWdaPrebuild
    ? Promise.resolve().then(() =>
        console.log('SKIP_WDA_PREBUILD=true — skipping WDA prebuild'),
      )
    : ensureWdaPrebuilt(),
]);

const installTasks = [];

if (appPath) {
  if (!existsSync(appPath)) {
    console.error(`IOS_APP_PATH does not exist: ${appPath}`);
    process.exit(1);
  }
  installTasks.push(installIosApp({ udid, bundleId, appPath }));
}

let iosWdaPreinstalled = 'false';
let iosWdaBundleIdBase = '';

if (hasUsableWdaArtifacts()) {
  const { wdaApp } = findWdaArtifacts(getDerivedDataPath());
  if (wdaApp) {
    installTasks.push(
      installWdaOnSimulator({ udid, wdaApp })
        .then((installedBundleId) => {
          iosWdaPreinstalled = 'true';
          iosWdaBundleIdBase = toWdaBundleIdBase(installedBundleId);
        })
        .catch((error) => {
          const message = error instanceof Error ? error.message : String(error);
          console.warn(
            `WDA simctl install failed — tests will use xcodebuild path: ${message}`,
          );
        }),
    );
  }
} else {
  console.log(
    'WDA artifacts not found — skipping sim WDA install (tests will use xcodebuild).',
  );
}

await Promise.all(installTasks);

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
      `WDA warm-up failed — prepare continues; Playwright will attach to WDA (may be cold): ${message}`,
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
