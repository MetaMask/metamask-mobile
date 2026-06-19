import dotenv from 'dotenv';
import os from 'node:os';
import path from 'node:path';

dotenv.config({ path: '.e2e.env' });

import { Platform, ProviderName } from './framework/types';
import { defineConfig } from './framework/config';

// Local e2e debug APK (io.metamask). Override with ANDROID_APK_PATH in .e2e.env.
// Debug builds load JS from Metro — start Metro before running tests.
const DEFAULT_ANDROID_APK =
  'android/app/build/outputs/apk/prod/debug/app-prod-debug.apk';

const resolveAndroidApkPath = (): string => {
  const repoRoot = path.resolve(__dirname, '..');
  const raw = process.env.ANDROID_APK_PATH?.trim();
  const candidate = raw || DEFAULT_ANDROID_APK;
  const expanded = candidate
    .replace(/\$HOME/g, os.homedir())
    .replace(/^~(?=\/)/, os.homedir());
  return path.isAbsolute(expanded)
    ? expanded
    : path.resolve(repoRoot, expanded);
};
const DEFAULT_IOS_APP =
  'ios/build/Build/Products/Debug-iphonesimulator/MetaMask.app';

/**
 * Playwright runner config for Appium smoke tests.
 *
 * Runs Appium smoke specs from tests/smoke-appium. Tags live in describe titles
 * via tags.js (same convention as Detox); --grep uses the tag id (e.g. SmokeAccounts).
 *
 * IMPORTANT: Requires an e2e build with HAS_TEST_OVERRIDES=true so the app
 * fetches fixture state from /state.json on launch.
 *
 * Default Android APK: android/app/build/outputs/apk/prod/debug/app-prod-debug.apk
 * (debug e2e build — requires Metro running on WATCHER_PORT / METRO_PORT_E2E, default 8081).
 *
 * Environment variables (all optional — defaults shown):
 * - ANDROID_APK_PATH — path to the APK (default: prod debug e2e APK in android/app/build/...)
 * - IOS_APP_PATH — path to the .app (default: Debug-iphonesimulator/MetaMask.app)
 * - ANDROID_AVD_NAME — AVD name (default: 'Pixel_5_Pro_API_34')
 * - IOS_SIMULATOR_NAME — simulator name (default: 'iPhone 16 Pro')
 * - IOS_SIMULATOR_UDID — booted sim UDID (CI sets this from prepare-ios-appium-runner)
 * - APPIUM_SMOKE_SUITE_NAME — CI suite id for per-job report/video paths
 * - PLAYWRIGHT_JSON_OUTPUT_FILE — CI path for Playwright JSON report (always playwright-report.json per job; suite id is the artifact name)
 *
 * Usage:
 * yarn appium-smoke:android
 * yarn appium-smoke:ios
 */
const suiteName = process.env.APPIUM_SMOKE_SUITE_NAME?.trim();
const perTestTimeoutMs = process.env.E2E_WAIT_TIMEOUT_MS
  ? 5 * 60 * 1000
  : 15 * 60 * 1000;
const htmlReportDir = suiteName
  ? `./test-reports/appium-smoke-report/${suiteName}`
  : './test-reports/appium-smoke-report';
const junitReportPath = suiteName
  ? `./test-reports/appium-smoke-junit/${suiteName}.xml`
  : './test-reports/appium-smoke-junit.xml';
const jsonReportPath = process.env.PLAYWRIGHT_JSON_OUTPUT_FILE?.trim();

export default defineConfig({
  testDir: './smoke-appium',
  fullyParallel: false,
  // Per-test timeout: cold WDA build on CI can take up to 10 min plus test time.
  timeout: perTestTimeoutMs,
  retries: process.env.CI === 'true' ? 1 : 0,
  reporter: [
    ['html', { open: 'never', outputFolder: htmlReportDir }],
    ['junit', { outputFile: junitReportPath }],
    ['list'],
    ...(jsonReportPath
      ? ([['json', { outputFile: jsonReportPath }] as const] as const)
      : []),
    // CI: step summary + JUnit (dorny/test-reporter). Skip the `github` reporter —
    // it emits error annotations for failed retry attempts even when the test
    // eventually passes, which makes passing jobs look failed in the UI.
    ...(process.env.CI === 'true'
      ? ([['./reporters/github-step-summary-reporter.mjs'] as const] as const)
      : []),
  ],

  projects: [
    {
      name: 'android-smoke',
      use: {
        platform: Platform.ANDROID,
        device: {
          provider: ProviderName.EMULATOR,
          name: process.env.ANDROID_AVD_NAME || 'Pixel_5_Pro_API_34',
          ...(process.env.ANDROID_DEVICE_UDID?.trim()
            ? { udid: process.env.ANDROID_DEVICE_UDID.trim() }
            : {}),
        },
        app: {
          packageName: 'io.metamask',
          launchableActivity: 'io.metamask.MainActivity',
          buildPath: resolveAndroidApkPath(),
        },
      },
    },
    {
      name: 'ios-smoke',
      use: {
        platform: Platform.IOS,
        device: {
          provider: ProviderName.SIMULATOR,
          name: process.env.IOS_SIMULATOR_NAME || 'iPhone 16 Pro',
          ...(process.env.IOS_SIMULATOR_UDID?.trim()
            ? { udid: process.env.IOS_SIMULATOR_UDID.trim() }
            : {}),
        },
        app: {
          appId: 'io.metamask.MetaMask',
          buildPath: process.env.IOS_APP_PATH || DEFAULT_IOS_APP,
        },
      },
    },
  ],
});
