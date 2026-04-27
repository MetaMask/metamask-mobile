import dotenv from 'dotenv';
dotenv.config({ path: '.e2e.env' });

import { Platform } from './framework/types';
import { defineConfig } from './framework/config';

process.env.SYSTEM_TEST_MODE = 'true';

export default defineConfig({
  testDir: './',
  fullyParallel: false,
  timeout: 7 * 60 * 1000,
  retries: 1,
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
      name: 'system-android-login',
      testMatch: '**/performance/login/**/*.spec.ts',
      use: {
        platform: Platform.ANDROID,
        device: {
          provider: 'browserstack',
          name: process.env.BROWSERSTACK_DEVICE || 'Samsung Galaxy S23 Ultra',
          osVersion: process.env.BROWSERSTACK_OS_VERSION || '13.0',
        },
        app: {
          packageName: 'io.metamask',
          launchableActivity: 'io.metamask.MainActivity',
        },
        buildPath: process.env.BROWSERSTACK_ANDROID_APP_URL,
      },
    },
    {
      name: 'system-android-onboarding',
      testMatch: '**/performance/onboarding/**/*.spec.ts',
      testIgnore: '**/performance/onboarding/seedless-*.spec.ts',
      use: {
        platform: Platform.ANDROID,
        device: {
          provider: 'browserstack',
          name: process.env.BROWSERSTACK_DEVICE || 'Samsung Galaxy S23 Ultra',
          osVersion: process.env.BROWSERSTACK_OS_VERSION || '13.0',
        },
        app: {
          packageName: 'io.metamask',
          launchableActivity: 'io.metamask.MainActivity',
        },
        buildPath:
          process.env.BROWSERSTACK_ANDROID_ONBOARDING_PERF_APP_URL ??
          process.env.BROWSERSTACK_ANDROID_CLEAN_APP_URL,
      },
    },
    {
      name: 'system-ios-login',
      testMatch: '**/performance/login/**/*.spec.ts',
      use: {
        platform: Platform.IOS,
        device: {
          provider: 'browserstack',
          name: process.env.BROWSERSTACK_DEVICE || 'iPhone 16 Pro Max',
          osVersion: process.env.BROWSERSTACK_OS_VERSION || '18',
        },
        app: {
          appId: 'io.metamask.MetaMask',
        },
        buildPath: process.env.BROWSERSTACK_IOS_APP_URL,
      },
    },
    {
      name: 'system-ios-onboarding',
      testMatch: '**/performance/onboarding/**/*.spec.ts',
      testIgnore: '**/performance/onboarding/seedless-*.spec.ts',
      use: {
        platform: Platform.IOS,
        device: {
          provider: 'browserstack',
          name: process.env.BROWSERSTACK_DEVICE || 'iPhone 16 Pro Max',
          osVersion: process.env.BROWSERSTACK_OS_VERSION || '18',
        },
        app: {
          appId: 'io.metamask.MetaMask',
        },
        buildPath:
          process.env.BROWSERSTACK_IOS_ONBOARDING_PERF_APP_URL ??
          process.env.BROWSERSTACK_IOS_CLEAN_APP_URL,
      },
    },
  ],
});
