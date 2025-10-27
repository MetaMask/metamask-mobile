// In appwright.config.ts
import dotenv from 'dotenv';
dotenv.config({ path: '.e2e.env' });
import { defineConfig, Platform } from 'appwright';
export default defineConfig({
  timeout: 7 * 60 * 1000, //7 minutes until we introduce fixtures
  expect: {
    timeout: 30 * 1000, //30 seconds
  },
  reporter: [
    // The default HTML reporter from Appwright
    [
      'html',
      { open: 'never', outputFolder: './test-reports/appwright-report' },
    ],
    ['./reporters/custom-reporter.js'],
    ['list'],
  ],

  projects: [
    {
      name: 'android',
      testMatch: '**/tests/performance/**/*.spec.js',
      use: {
        platform: Platform.ANDROID,
        device: {
          provider: 'emulator',
          name: 'Samsung Galaxy S24 Ultra', // this can be changed to your emulator name
          osVersion: '14', // this can be changed to your emulator version
        },
        buildPath: 'PATH-TO-BUILD', // Path to your .apk file
        expectTimeout: 30 * 1000,
      },
    },
    {
      name: 'ios',
      testMatch: '**/tests/performance/**/*.spec.js',
      use: {
        platform: Platform.IOS,
        device: {
          provider: 'emulator',
          osVersion: '16.0', // this can be changed to your simulator version
        },
        buildPath: 'PATH-TO-BUILD', // Path to your .app file
        expectTimeout: 30 * 1000,
      },
    },
    {
      name: 'browserstack-android',
      testMatch: '**/tests/performance/login/**/*.spec.js',
      use: {
        platform: Platform.ANDROID,
        device: {
          provider: 'browserstack',
          name: process.env.BROWSERSTACK_DEVICE || 'Samsung Galaxy S23 Ultra', // this can changed
          osVersion: process.env.BROWSERSTACK_OS_VERSION || '13.0', // this can changed
        },
        buildPath: process.env.BROWSERSTACK_ANDROID_APP_URL, // Path to Browserstack url
        expectTimeout: 30 * 1000,
      },
    },
    {
      name: 'browserstack-ios',
      testMatch: '**/tests/performance/login/**/*.spec.js',
      use: {
        platform: Platform.IOS,
        device: {
          provider: 'browserstack',
          name: process.env.BROWSERSTACK_DEVICE || 'iPhone 14 Pro Max',
          osVersion: process.env.BROWSERSTACK_OS_VERSION || '16.0',
        },
        buildPath: process.env.BROWSERSTACK_IOS_APP_URL,
        expectTimeout: 30 * 1000,
      },
    },
    {
      name: 'android-onboarding',
      testMatch: '**/tests/performance/onboarding/**/*.spec.js',
      use: {
        platform: Platform.ANDROID,
        device: {
          provider: 'browserstack',
          name: process.env.BROWSERSTACK_DEVICE || 'Samsung Galaxy S23 Ultra',
          osVersion: process.env.BROWSERSTACK_OS_VERSION || '13.0',
        },
        buildPath: process.env.BROWSERSTACK_ANDROID_CLEAN_APP_URL,
        expectTimeout: 30 * 1000,
      },
    },
    {
      name: 'ios-onboarding',
      testMatch: '**/tests/performance/onboarding/**/*.spec.js',
      use: {
        platform: Platform.IOS,
        device: {
          provider: 'browserstack',
          name: process.env.BROWSERSTACK_DEVICE || 'iPhone 14 Pro Max',
          osVersion: process.env.BROWSERSTACK_OS_VERSION || '16.0',
        },
        buildPath: process.env.BROWSERSTACK_IOS_CLEAN_APP_URL,
        expectTimeout: 30 * 1000,
      },
    },
    {
      name: 'mm-connect-ios-browserstack',
      testMatch: '**/tests/mm-connect/**/*.spec.js',
      use: {
        platform: Platform.IOS,
        device: {
          provider: 'browserstack',
          name: process.env.BROWSERSTACK_DEVICE || 'iPhone 14 Pro Max',
          osVersion: process.env.BROWSERSTACK_OS_VERSION || '16.0',
        },
        buildPath: 'bs://a0ea40650b0a1108e32b27ec93ac73af3b393855', // Just a demo, CI will take care of this
        expectTimeout: 30 * 1000, //90 seconds  increased since login the app takes longer
      },
    },
    {
      name: 'mm-connect-ios-local',
      testMatch: '**/tests/mm-connect/**/*.spec.js',
      use: {
        platform: Platform.IOS,
        device: {
          provider: 'emulator',
          osVersion: '16.0', // this can be changed to your simulator version
        },
        buildPath: 'PATH-TO-BUILD', // Path to your .app file
        expectTimeout: 30 * 1000, //90 seconds  increased since login the app takes longer
      },
    },
    {
      name: 'mm-connect-android-browserstack',
      testMatch: '**/tests/mm-connect/**/*.spec.js',
      use: {
        platform: Platform.ANDROID,
        device: {
          provider: 'browserstack',
          name: process.env.BROWSERSTACK_DEVICE || 'Samsung Galaxy S23 Ultra', // this can changed
          osVersion: process.env.BROWSERSTACK_OS_VERSION || '13.0', // this can changed
        },
        buildPath: process.env.BROWSERSTACK_ANDROID_APP_URL, // Path to Browserstack url
        expectTimeout: 30 * 1000, //90 seconds  increased since login the app takes longer
      },
    },
    {
      name: 'mm-connect-android-local',
      testMatch: '**/tests/mm-connect/**/*.spec.js',
      use: {
        platform: Platform.ANDROID,
        device: {
          provider: 'emulator',
          name: 'Samsung Galaxy S24 Ultra', // this can be changed to your emulator name
          osVersion: '14', // this can be changed to your emulator version
        },
        buildPath: 'PATH-TO-BUILD', // Path to your .apk file
        expectTimeout: 30 * 1000, //90 seconds  increased since login the app takes longer
      },
    },
  ],
});
