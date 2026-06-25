import dotenv from 'dotenv';
dotenv.config({ path: '.e2e.env' });

import { Platform, ProviderName } from './framework/types';
import { defineConfig } from './framework/config';

// Requires HAS_TEST_OVERRIDES=true baked in at Metro bundle time so the app
// activates ReadOnlyNetworkStore and fetches fixture state from /state.json.
// Build with: CONFIGURATION=Debug yarn build:android:main:e2e
// (or add HAS_TEST_OVERRIDES=true + METAMASK_ENVIRONMENT=e2e to .js.env and
//  run CONFIGURATION=Debug yarn build:android:main:e2e)
const DEFAULT_ANDROID_APK =
  'android/app/build/outputs/apk/prod/debug/app-prod-debug.apk';
const DEFAULT_IOS_APP =
  'ios/build/Build/Products/Debug-iphonesimulator/MetaMask.app';

/**
 * Playwright runner config for Appium smoke tests.
 *
 * Runs Appium smoke specs from tests/smoke-appium. Tags live in describe titles
 * via tags.js (same convention as Detox); --grep uses the tag id (e.g. SmokeAccounts).
 *
 * IMPORTANT: Requires a debug build with HAS_TEST_OVERRIDES=true so the app
 * fetches fixture state from /state.json on launch. Build with:
 * CONFIGURATION=Debug yarn build:android:main:e2e (Android)
 * CONFIGURATION=Debug yarn build:ios:main:e2e (iOS)
 *
 * Environment variables (all optional — defaults shown):
 * - ANDROID_APK_PATH — path to the APK (default: prod debug APK)
 * - IOS_APP_PATH — path to the .app (default: Debug-iphonesimulator/MetaMask.app)
 * - ANDROID_AVD_NAME — AVD name (default: 'Pixel_5_Pro_API_34')
 * - IOS_SIMULATOR_NAME — simulator name (default: 'iPhone 16 Pro')
 * - IOS_SIMULATOR_UDID — booted sim UDID (CI sets this from prepare-ios-appium-runner)
 * - IOS_SIMULATOR_POST_BOOT_SETTLE_MS — pause after sim boot before install/tests (CI: 30000)
 * - IOS_APP_WARM_LAUNCH_SETTLE_MS — prepare-step warm launch dwell time (CI: 15000)
 * - IOS_PRE_LAUNCH_SETTLE_MS — pause after terminate before Appium relaunch (default: 1500)
 * - APPIUM_SMOKE_SUITE_NAME — CI suite id for per-job report/video paths
 * - PLAYWRIGHT_JSON_OUTPUT_FILE — CI path for Playwright JSON report (always playwright-report.json per job; suite id is the artifact name)
 *
 * Usage:
 * yarn appium-smoke:android
 * yarn appium-smoke:ios
 */
const suiteName = process.env.APPIUM_SMOKE_SUITE_NAME?.trim();
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
  timeout: 15 * 60 * 1000,
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
        },
        app: {
          packageName: 'io.metamask',
          launchableActivity: 'io.metamask.MainActivity',
          buildPath: process.env.ANDROID_APK_PATH || DEFAULT_ANDROID_APK,
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
