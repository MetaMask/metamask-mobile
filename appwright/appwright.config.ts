// In appwright.config.ts
import dotenv from 'dotenv';
dotenv.config({ path: '.e2e.env' });
import { defineConfig, Platform } from 'appwright';
export default defineConfig({
  testMatch: '**/specs/*.spec.js',
  timeout: 7 * 60 * 1000, //7 minutes until we introduce fixtures
  expect: {
    timeout: 30 * 1000, //30 seconds
  },

  projects: [
    {
      name: 'browserstack-android',
      use: {
        platform: Platform.ANDROID,
        device: {
          provider: 'browserstack', // or 'local-device' or 'browserstack'
          name: process.env.BROWSERSTACK_DEVICE || 'Samsung Galaxy S23 Ultra', // this can changed
          osVersion: process.env.BROWSERSTACK_OS_VERSION || '13.0', // this can changed
        },
        buildPath: process.env.BROWSERSTACK_ANDROID_APP_URL, // Path to Browserstack url bs:// link release-7.53.0-7.53.0-2223.apk
      },
    },
    {
      name: 'browserstack-ios',
      use: {
        platform: Platform.IOS,
        device: {
          provider: 'browserstack',
          name: process.env.BROWSERSTACK_DEVICE || 'iPhone 14 Pro Max',
          osVersion: process.env.BROWSERSTACK_OS_VERSION || '16.0',
        },
        buildPath: process.env.BROWSERSTACK_IOS_APP_URL, // Path to Browserstack url bs:// link //release-7.53.0-7.53.0-2223.ipa
      },
    },
  ],
});