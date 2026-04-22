import { Platform } from './framework/types';
import { defineConfig } from './framework/config';

/**
 * THIS IS CURRENTLY NOT IN USE. IT'LL BE USED ONCE WE MIGRATE TO THE NEW
 * FRAMEWORK.
 */
export default defineConfig({
  testDir: './',
  fullyParallel: false,
  timeout: 7 * 60 * 1000, //7 minutes until we introduce fixtures
  reporter: [
    [
      'html',
      { open: 'never', outputFolder: './test-reports/appwright-report' },
    ],
    ['./reporters/PerformanceReporter.ts'],
    ['list'],
  ],
  use: {
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'android',
      testMatch: [
        'tests/performance/**/*.spec.ts',
        'tests/performance/**/*.spec.js',
      ],
      use: {
        platform: Platform.ANDROID,
        device: {
          provider: 'emulator',
          name: 'Samsung Galaxy S24 Ultra',
          osVersion: '14', // 14 for local testing
        },
        app: {
          packageName: 'io.metamask',
          launchableActivity: 'io.metamask.MainActivity',
        },
        buildPath: 'PATH-TO-BUILD', // Path to your .apk file
      },
    },
    {
      // Browserstack does not support appium 3 just yet.
      name: 'browserstack-android',
      testMatch: '**/performance/login/**/*.spec.ts',
      use: {
        platform: Platform.ANDROID,
        device: {
          provider: 'browserstack',
          name: process.env.BROWSERSTACK_DEVICE || 'Samsung Galaxy S25 Ultra', // this can changed
          osVersion: process.env.BROWSERSTACK_OS_VERSION || '15.0', // this can changed
        },
        app: {
          packageName: 'io.metamask',
          launchableActivity: 'io.metamask.MainActivity',
        },
        buildPath: process.env.BROWSERSTACK_ANDROID_APP_URL, // Path to Browserstack url
      },
    },
    {
      name: 'ios',
      testMatch: '**/performance/login/**/*.spec.ts',
      use: {
        platform: Platform.IOS,
        device: {
          provider: 'emulator',
          osVersion: '16.0',
        },
        app: {
          appId: 'io.metamask.MetaMask',
        },
        buildPath: 'PATH-TO-BUILD', // Path to your .app file
      },
    },
    {
      name: 'browserstack-ios',
      testMatch: '**/performance/login/**/*.spec.ts',
      use: {
        platform: Platform.IOS,
        device: {
          provider: 'browserstack',
          name: process.env.BROWSERSTACK_DEVICE || 'iPhone 14 Pro Max',
          osVersion: process.env.BROWSERSTACK_OS_VERSION || '16.0',
        },
        app: {
          appId: 'io.metamask.MetaMask',
        },
        buildPath: process.env.BROWSERSTACK_IOS_APP_URL,
      },
    },

    {
      name: 'android-onboarding',
      testMatch: '**/performance/onboarding/**/*.spec.ts',
      testIgnore: '**/performance/onboarding/seedless-*.spec.ts',

      use: {
        platform: Platform.ANDROID,
        device: {
          provider: 'browserstack',
          name: process.env.BROWSERSTACK_DEVICE || 'Samsung Galaxy S25 Ultra',
          osVersion: process.env.BROWSERSTACK_OS_VERSION || '15.0',
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
      name: 'ios-onboarding',
      testMatch: '**/performance/onboarding/**/*.spec.ts',
      testIgnore: '**/performance/onboarding/seedless-*.spec.ts',
      use: {
        platform: Platform.IOS,
        device: {
          provider: 'browserstack',
          name: process.env.BROWSERSTACK_DEVICE || 'iPhone 14 Pro Max',
          osVersion: process.env.BROWSERSTACK_OS_VERSION || '16.0',
        },
        app: {
          appId: 'io.metamask.MetaMask',
        },
        buildPath:
          process.env.BROWSERSTACK_IOS_ONBOARDING_PERF_APP_URL ??
          process.env.BROWSERSTACK_IOS_CLEAN_APP_URL,
      },
    },
    {
      name: 'mm-connect-ios-browserstack',
      testMatch: '**/performance/mm-connect/**/*.spec.ts',
      use: {
        platform: Platform.IOS,
        device: {
          provider: 'browserstack',
          name: process.env.BROWSERSTACK_DEVICE || 'iPhone 14 Pro Max',
          osVersion: process.env.BROWSERSTACK_OS_VERSION || '16.0',
        },
        app: {
          appId: 'io.metamask.MetaMask',
        },
        buildPath: 'bs://a0ea40650b0a1108e32b27ec93ac73af3b393855', // Just a demo, CI will take care of this
      },
    },
    {
      name: 'mm-connect-ios-local',
      testMatch: '**/performance/mm-connect/**/*.spec.ts',
      use: {
        platform: Platform.IOS,
        device: {
          provider: 'emulator',
          osVersion: '16.0', // this can be changed to your simulator version
        },
        app: {
          appId: 'io.metamask.MetaMask',
        },
        buildPath: 'PATH-TO-BUILD', // Path to your .app file
      },
    },
    {
      name: 'mm-connect-android-browserstack',
      testMatch: '**/performance/mm-connect/**/*.spec.ts',
      use: {
        platform: Platform.ANDROID,
        device: {
          provider: 'browserstack',
          name: process.env.BROWSERSTACK_DEVICE || 'Samsung Galaxy S25 Ultra', // this can changed
          osVersion: process.env.BROWSERSTACK_OS_VERSION || '15.0', // this can changed
        },
        app: {
          packageName: 'io.metamask',
          launchableActivity: 'io.metamask.MainActivity',
        },
        buildPath: process.env.BROWSERSTACK_ANDROID_APP_URL, // Path to Browserstack url
      },
    },
    {
      name: 'mm-connect-android-local',
      testMatch: '**/performance/mm-connect/**/*.spec.ts',
      use: {
        platform: Platform.ANDROID,
        device: {
          provider: 'emulator',
          name: 'Samsung Galaxy S24 Ultra', // this can be changed to your emulator name
          osVersion: '14', // this can be changed to your emulator version
        },
        app: {
          packageName: 'io.metamask',
          launchableActivity: 'io.metamask.MainActivity',
        },
        buildPath: 'PATH-TO-BUILD', // Path to your .apk file
      },
    },
    {
      name: 'android-onboarding-seedless',
      testMatch: '**/performance/onboarding/seedless-*.spec.ts',
      use: {
        platform: Platform.ANDROID,
        device: {
          provider: 'browserstack',
          name: process.env.BROWSERSTACK_DEVICE || 'Samsung Galaxy S25 Ultra',
          osVersion: process.env.BROWSERSTACK_OS_VERSION || '15.0',
        },
        app: {
          packageName: 'io.metamask',
          launchableActivity: 'io.metamask.MainActivity',
        },
        buildPath:
          process.env.BROWSERSTACK_ANDROID_SEEDLESS_PERF_APP_URL ??
          process.env.BROWSERSTACK_ANDROID_CLEAN_APP_URL,
      },
    },
    {
      name: 'ios-onboarding-seedless',
      testMatch: '**/performance/onboarding/seedless-*.spec.ts',
      use: {
        platform: Platform.IOS,
        device: {
          provider: 'browserstack',
          name: process.env.BROWSERSTACK_DEVICE || 'iPhone 14 Pro Max',
          osVersion: process.env.BROWSERSTACK_OS_VERSION || '16.0',
        },
        app: {
          appId: 'io.metamask.MetaMask',
        },
        buildPath:
          process.env.BROWSERSTACK_IOS_SEEDLESS_PERF_APP_URL ??
          process.env.BROWSERSTACK_IOS_CLEAN_APP_URL,
      },
    },
  ],
});
