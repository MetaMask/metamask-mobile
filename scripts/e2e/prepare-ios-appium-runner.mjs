#!/usr/bin/env node
/* eslint-disable import-x/no-nodejs-modules */
/**
 * Prepares the iOS Appium runner before Playwright tests:
 * - Boots the simulator
 * - Prebuilds WDA (unless SKIP_WDA_PREBUILD=true)
 * - Installs the .app via simctl
 *
 * Simulator boot and WDA prebuild run in parallel to shave wall-clock time on
 * cache miss (WDA ~8 min, sim boot ~1–2 min → overlap saves ~1–2 min).
 */
import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync } from 'node:fs';
import { bootIosSimulator, installIosApp } from './ios-simulator-lib.mjs';
import { ensureWdaPrebuilt } from './wda-lib.mjs';

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

if (appPath) {
  if (!existsSync(appPath)) {
    console.error(`IOS_APP_PATH does not exist: ${appPath}`);
    process.exit(1);
  }
  await installIosApp({ udid, bundleId, appPath });
}

console.log(`IOS_SIMULATOR_UDID=${udid}`);

if (process.env.GITHUB_OUTPUT) {
  appendFileSync(
    process.env.GITHUB_OUTPUT,
    `ios-simulator-udid=${udid}\n`,
  );
}

console.log('iOS Appium runner ready.');
