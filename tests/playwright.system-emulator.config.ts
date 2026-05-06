import dotenv from 'dotenv';
dotenv.config({ path: '.e2e.env' });

import { Platform, ProviderName } from './framework/types';
import { defineConfig } from './framework/config';

// Activate system test mode — disables quality gates, Sentry, and perf reporting
process.env.SYSTEM_TEST_MODE = 'true';

// ---------- Default build paths (match Detox / standard build output) ----------
const DEFAULT_ANDROID_APK =
  'android/app/build/outputs/apk/prod/debug/app-prod-debug.apk';
const DEFAULT_IOS_APP =
  'ios/build/Build/Products/Release-iphonesimulator/MetaMask.app';

/**
 * System test config for local emulators / simulators.
 *
 * Same test specs and SYSTEM_TEST_MODE as playwright.system.config.ts (BrowserStack),
 * but runs on a local Android emulator or iOS simulator via Appium.
 *
 * All environment variables have sensible defaults so you can run system tests
 * right after a standard debug build (`yarn build:android:main:e2e` / `yarn build:ios:main:e2e`).
 *
 * Environment variables (all optional — defaults shown):
 * - ANDROID_APK_PATH — Path to APK for login tests (default: prod debug APK)
 * - ANDROID_CLEAN_APK_PATH — Path to clean APK for onboarding (default: same as ANDROID_APK_PATH)
 * - IOS_APP_PATH — Path to .app for login tests (default: Release-iphonesimulator/MetaMask.app)
 * - IOS_CLEAN_APP_PATH — Path to clean .app for onboarding (default: same as IOS_APP_PATH)
 * - ANDROID_AVD_NAME — AVD name (default: 'Pixel_5_Pro_API_34')
 * - IOS_SIMULATOR_NAME — Simulator name (default: 'iPhone 15 Pro')
 *
 * Usage:
 * yarn run-system-tests:android-login-emu
 * ANDROID_APK_PATH=/path/to/app.apk yarn run-system-tests:android-login-emu
 * yarn run-system-tests:ios-login-sim
 */
export default defineConfig({
  testDir: './',
  fullyParallel: false,
  timeout: 7 * 60 * 1000,
  retries: 1,
  grep: /@System/,
  reporter: [
    [
      'html',
      { open: 'never', outputFolder: './test-reports/system-test-report' },
    ],
    ['list'],
  ],
  use: {
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'system-android-login-emu',
      testMatch: '**/performance/login/**/*.spec.ts',
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
      name: 'system-android-onboarding-emu',
      testMatch: '**/performance/onboarding/**/*.spec.ts',
      testIgnore: '**/performance/onboarding/seedless-*.spec.ts',
      use: {
        platform: Platform.ANDROID,
        device: {
          provider: ProviderName.EMULATOR,
          name: process.env.ANDROID_AVD_NAME || 'Pixel_5_Pro_API_34',
        },
        app: {
          packageName: 'io.metamask',
          launchableActivity: 'io.metamask.MainActivity',
          buildPath:
            process.env.ANDROID_CLEAN_APK_PATH ||
            process.env.ANDROID_APK_PATH ||
            DEFAULT_ANDROID_APK,
        },
      },
    },
    {
      name: 'system-ios-login-sim',
      testMatch: '**/performance/login/**/*.spec.ts',
      use: {
        platform: Platform.IOS,
        device: {
          provider: ProviderName.SIMULATOR,
          name: process.env.IOS_SIMULATOR_NAME || 'iPhone 15 Pro',
        },
        app: {
          appId: 'io.metamask.MetaMask',
          buildPath: process.env.IOS_APP_PATH || DEFAULT_IOS_APP,
        },
      },
    },
    {
      name: 'system-ios-onboarding-sim',
      testMatch: '**/performance/onboarding/**/*.spec.ts',
      testIgnore: '**/performance/onboarding/seedless-*.spec.ts',
      use: {
        platform: Platform.IOS,
        device: {
          provider: ProviderName.SIMULATOR,
          name: process.env.IOS_SIMULATOR_NAME || 'iPhone 15 Pro',
        },
        app: {
          appId: 'io.metamask.MetaMask',
          buildPath:
            process.env.IOS_CLEAN_APP_PATH ||
            process.env.IOS_APP_PATH ||
            DEFAULT_IOS_APP,
        },
      },
    },
  ],
});
