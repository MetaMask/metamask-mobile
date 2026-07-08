import dotenv from 'dotenv';
dotenv.config({ path: '.e2e.env' });

import { Platform, ProviderName } from './framework/types';
import { defineConfig } from './framework/config';

// Requires HAS_TEST_OVERRIDES=true baked in at build time so the app activates
// ReadOnlyNetworkStore and fetches fixture state from /state.json.
//
// Defaults match Detox local debug e2e output
// Override with ANDROID_APK_PATH / IOS_APP_PATH for release/main-e2e artifacts
// (e.g. build/ci-main-e2e/app-prod-release.apk) — launch helpers detect release
// from the path and skip Metro deep-link automatically.
const DEFAULT_ANDROID_APK =
  process.env.ANDROID_APK_PATH?.trim() ||
  process.env.PREBUILT_ANDROID_APK_PATH?.trim() ||
  'android/app/build/outputs/apk/prod/debug/app-prod-debug.apk';
const DEFAULT_IOS_APP =
  process.env.IOS_APP_PATH?.trim() ||
  process.env.PREBUILT_IOS_APP_PATH?.trim() ||
  'ios/build/Build/Products/Debug-iphonesimulator/MetaMask.app';

/**
 * Playwright runner config for Appium smoke tests.
 *
 * Runs Appium smoke specs from tests/smoke-appium. Tags live in describe titles
 * via tags.js (same convention as Detox); --grep uses the tag id (e.g. SmokeAccounts).
 *
 * Environment variables (all optional — defaults shown):
 * - PREBUILT_ANDROID_APK_PATH — e2e APK from .e2e.env (overrides default debug path)
 * - ANDROID_APK_PATH — path to the APK (overrides PREBUILT_ANDROID_APK_PATH)
 * - PREBUILT_IOS_APP_PATH — e2e .app from .e2e.env (overrides default debug path)
 * - IOS_APP_PATH — path to the .app (overrides PREBUILT_IOS_APP_PATH)
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
 *
 * Release CI artifact locally:
 * ANDROID_APK_PATH=build/ci-main-e2e/app-prod-release.apk yarn appium-smoke:android
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
      timeout: 8 * 60 * 1000,
      use: {
        platform: Platform.ANDROID,
        device: {
          provider: ProviderName.EMULATOR,
          name: process.env.ANDROID_AVD_NAME || 'Pixel_5_Pro_API_34',
        },
        app: {
          packageName: 'io.metamask',
          launchableActivity: 'io.metamask.MainActivity',
          buildPath: DEFAULT_ANDROID_APK,
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
          buildPath: DEFAULT_IOS_APP,
        },
      },
    },
  ],
});
