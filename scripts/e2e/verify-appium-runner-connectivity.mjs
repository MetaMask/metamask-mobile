#!/usr/bin/env node
/**
 * CI preflight for Appium smoke jobs.
 *
 * Validates emulator/simulator plumbing before Playwright starts. This does not
 * start the E2E mock server; per-test reachability is verified in withFixtures().
 *
 * Usage:
 *   node scripts/e2e/verify-appium-runner-connectivity.mjs android
 *   node scripts/e2e/verify-appium-runner-connectivity.mjs ios
 *
 * Env:
 *   ANDROID_AVD_NAME — boot this AVD before checks when no emulator is online (CI)
 *   ANDROID_SERIAL / IOS_SIMULATOR_UDID — optional device target
 *   SKIP_E2E_CONNECTIVITY_VERIFY=true — skip all checks
 */

import { appendFileSync } from 'node:fs';
import { verifyAppiumRunnerConnectivity } from '../../tests/framework/fixtures/EmulatorHostConnectivity.ts';

const platform = process.argv[2]?.toLowerCase();

if (platform !== 'android' && platform !== 'ios') {
  console.error(
    'Usage: node scripts/e2e/verify-appium-runner-connectivity.mjs <android|ios>',
  );
  process.exit(1);
}

const udid =
  platform === 'android'
    ? process.env.ANDROID_SERIAL?.trim()
    : process.env.IOS_SIMULATOR_UDID?.trim();

try {
  await verifyAppiumRunnerConnectivity({ platform, udid });
  if (
    platform === 'android' &&
    process.env.ANDROID_SERIAL?.trim() &&
    process.env.GITHUB_ENV
  ) {
    appendFileSync(
      process.env.GITHUB_ENV,
      `ANDROID_SERIAL=${process.env.ANDROID_SERIAL.trim()}\n`,
    );
  }
  console.log(`✅ Appium runner connectivity check passed (${platform})`);
} catch (error) {
  console.error(
    `❌ Appium runner connectivity check failed (${platform}):`,
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
}
