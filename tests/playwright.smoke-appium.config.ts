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
 * Runs tests tagged @SmokeAppium against a local Android emulator or iOS simulator.
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
 *
 * Usage:
 * yarn appium-smoke:android
 * yarn appium-smoke:ios
 */
export default defineConfig({
  testDir: './smoke-appium',
  fullyParallel: false,
  // Per-test timeout: WDA build on CI can take up to 10 min on first run,
  // plus test execution time. 15 min keeps CI healthy without hanging forever.
  timeout: 15 * 60 * 1000,
  retries: 1,
  grep: /@SmokeAppium/,
  reporter: [
    [
      'html',
      { open: 'never', outputFolder: './test-reports/appium-smoke-report' },
    ],
    ['list'],
  ],
  use: {
    trace: 'on-first-retry',
  },

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
        },
        app: {
          appId: 'io.metamask.MetaMask',
          buildPath: process.env.IOS_APP_PATH || DEFAULT_IOS_APP,
        },
      },
    },
  ],
});
