// In appwright.config.ts
const dotenv = require('dotenv');
dotenv.config({ path: '.e2e.env' });
import { defineConfig, Platform } from 'appwright';
export default defineConfig({
  testDir: './tests',
  reporter: [['./reporters/custom-reporter.js']],
  projects: [
    {
      name: 'android',
      use: {
        platform: Platform.ANDROID,
        device: {
          provider: 'emulator', // or 'local-device' or 'browserstack'
          name: 'Pixel 6', // this can changed
        },
        buildPath: '/Users/javi/Downloads/app-qa-release.apk', // Path to your .apk file
      },
    },
    {
      name: 'ios',
      use: {
        platform: Platform.IOS,
        device: {
          provider: 'emulator', // or 'local-device' or 'browserstack'
        },
        buildPath: 'Metamask-QA.app', // Path to your .app file
      },
    },
    {
      name: 'browserstack-android',
      use: {
        platform: Platform.ANDROID,
        device: {
          provider: 'browserstack', // or 'local-device' or 'browserstack'
          name: 'Samsung Galaxy S23 Ultra', // this can changed
          osVersion: '13.0', // this can changed
        },
        buildPath: 'bs://url', // Path to Browserstack url bs:// link
      },
    },
    {
      name: 'browserstack-ios',
      use: {
        platform: Platform.IOS,
        device: {
          provider: 'browserstack',
          name: 'iPhone 14 Pro Max', // this can changed
          osVersion: '16.0', // this can changed
        },
        buildPath: 'bs://url', // Path to Browserstack url bs:// link
      },
    },
  ],
});
