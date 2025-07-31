// In appwright.config.ts
const dotenv = require('dotenv');
dotenv.config({ path: '.e2e.env' });
import { defineConfig, Platform } from 'appwright';
export default defineConfig({
  testDir: './tests',
  //reporter: [['./reporters/custom-reporter.js']],
  projects: [
    {
      name: 'android',
      use: {
        platform: Platform.ANDROID,
        device: {
          provider: 'emulator', // or 'local-device' or 'browserstack'
        },
        buildPath: './Users/curtisdavid/Downloads/app-qa-release.apk', // Path to your .apk file
        expectTimeout: 10000,
      },
    },
    {
      name: 'ios',
      use: {
        platform: Platform.IOS,
        device: {
          provider: 'emulator', // or 'local-device' or 'browserstack'
        },
        buildPath: 'Metamask-QA.ipa', // Path to your .app file
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
        buildPath: 'bs://ea381b24b190dd9a578d3ac9351474e20b4372df', // Path to Browserstack url bs:// link
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
        buildPath: 'bs://ffbc9a9f506c5d0a94eaf2dfaf39f16d0aff948d', // Path to Browserstack url bs:// link
      },
    },
  ],
});
