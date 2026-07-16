import { ProviderName, Platform } from './framework/types';
import { defineConfig } from './framework/config';

/**
 * Playwright config for TestMu AI (formerly LambdaTest) performance runs.
 * Kept separate from playwright.config.ts so BrowserStack setup stays untouched.
 */
export default defineConfig({
  testDir: './',
  fullyParallel: false,
  workers: process.env.PLAYWRIGHT_WORKERS
    ? parseInt(process.env.PLAYWRIGHT_WORKERS, 10)
    : 3,
  timeout: 7 * 60 * 1000,
  grep: /@Performance/,
  reporter: [
    [
      'html',
      { open: 'never', outputFolder: './test-reports/playwright-report' },
    ],
    ['./reporters/PerformanceReporter.ts'],
    ['list'],
  ],
  use: {
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'testmu-android',
      testMatch: '**/performance/login/**/*.spec.ts',
      use: {
        platform: Platform.ANDROID,
        device: {
          provider: ProviderName.TESTMU,
          name: process.env.TESTMU_DEVICE || 'Pixel 8 Pro',
          osVersion: process.env.TESTMU_OS_VERSION || '14',
        },
        app: {
          packageName: 'io.metamask',
          launchableActivity: 'io.metamask.MainActivity',
          buildPath: process.env.TESTMU_ANDROID_APP_URL,
        },
      },
    },
    {
      name: 'testmu-ios',
      testMatch: '**/performance/login/**/*.spec.ts',
      use: {
        platform: Platform.IOS,
        device: {
          provider: ProviderName.TESTMU,
          name: process.env.TESTMU_DEVICE || 'iPhone 14 Pro Max',
          osVersion: process.env.TESTMU_OS_VERSION || '16.0',
        },
        app: {
          appId: 'io.metamask.MetaMask',
          buildPath: process.env.TESTMU_IOS_APP_URL,
        },
      },
    },
    {
      name: 'testmu-android-onboarding',
      testMatch: '**/performance/onboarding/**/*.spec.ts',
      testIgnore: '**/performance/onboarding/seedless-*.spec.ts',
      use: {
        platform: Platform.ANDROID,
        device: {
          provider: ProviderName.TESTMU,
          name: process.env.TESTMU_DEVICE || 'Galaxy S25 Ultra',
          osVersion: process.env.TESTMU_OS_VERSION || '15',
        },
        app: {
          packageName: 'io.metamask',
          launchableActivity: 'io.metamask.MainActivity',
          buildPath:
            process.env.TESTMU_ANDROID_ONBOARDING_PERF_APP_URL ??
            process.env.TESTMU_ANDROID_CLEAN_APP_URL,
        },
      },
    },
    {
      name: 'testmu-ios-onboarding',
      testMatch: '**/performance/onboarding/**/*.spec.ts',
      testIgnore: '**/performance/onboarding/seedless-*.spec.ts',
      use: {
        platform: Platform.IOS,
        device: {
          provider: ProviderName.TESTMU,
          name: process.env.TESTMU_DEVICE || 'iPhone 14 Pro Max',
          osVersion: process.env.TESTMU_OS_VERSION || '16.0',
        },
        app: {
          appId: 'io.metamask.MetaMask',
          buildPath:
            process.env.TESTMU_IOS_ONBOARDING_PERF_APP_URL ??
            process.env.TESTMU_IOS_CLEAN_APP_URL,
        },
      },
    },
    {
      name: 'testmu-mm-connect-android',
      testMatch: '**/performance/mm-connect/**/*.spec.ts',
      timeout: 12 * 60 * 1000,
      use: {
        platform: Platform.ANDROID,
        device: {
          provider: ProviderName.TESTMU,
          name: process.env.TESTMU_DEVICE || 'Galaxy S25 Ultra',
          osVersion: process.env.TESTMU_OS_VERSION || '15',
          otherApps: process.env.TESTMU_RN_PLAYGROUND_URL
            ? [process.env.TESTMU_RN_PLAYGROUND_URL]
            : [],
        },
        app: {
          packageName: 'io.metamask',
          launchableActivity: 'io.metamask.MainActivity',
          buildPath: process.env.TESTMU_ANDROID_APP_URL,
        },
      },
    },
    {
      name: 'testmu-android-onboarding-seedless',
      testMatch: '**/performance/onboarding/seedless-*.spec.ts',
      use: {
        platform: Platform.ANDROID,
        device: {
          provider: ProviderName.TESTMU,
          name: process.env.TESTMU_DEVICE || 'Galaxy S25 Ultra',
          osVersion: process.env.TESTMU_OS_VERSION || '15',
        },
        app: {
          packageName: 'io.metamask',
          launchableActivity: 'io.metamask.MainActivity',
          buildPath:
            process.env.TESTMU_ANDROID_SEEDLESS_PERF_APP_URL ??
            process.env.TESTMU_ANDROID_CLEAN_APP_URL,
        },
      },
    },
    {
      name: 'testmu-ios-onboarding-seedless',
      testMatch: '**/performance/onboarding/seedless-*.spec.ts',
      use: {
        platform: Platform.IOS,
        device: {
          provider: ProviderName.TESTMU,
          name: process.env.TESTMU_DEVICE || 'iPhone 14 Pro Max',
          osVersion: process.env.TESTMU_OS_VERSION || '16.0',
        },
        app: {
          appId: 'io.metamask.MetaMask',
          buildPath:
            process.env.TESTMU_IOS_SEEDLESS_PERF_APP_URL ??
            process.env.TESTMU_IOS_CLEAN_APP_URL,
        },
      },
    },
  ],
});
