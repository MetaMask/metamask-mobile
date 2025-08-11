// In appwright.config.ts
const dotenv = require('dotenv');
dotenv.config({ path: '.e2e.env' });
import { defineConfig, Platform } from 'appwright';
export default defineConfig({
  testMatch: '**/tests/sendEthereum.spec.js',
  reporter: [
    // The default HTML reporter from Appwright
    ['html', { open: 'never', outputFolder: './test-reports/appwright-report' }],
    ['./reporters/custom-reporter.js'],
    ['list']
  ],

  projects: [
    {
      name: 'android',
      use: {
        platform: Platform.ANDROID,
        device: {
          provider: 'emulator', // or 'local-device' or 'browserstack'
          name: 'Samsung Galaxy S24 Ultra', // this can changed
          osVersion: '14.0', // this can changed
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
          osVersion: '16.0', // this can changed
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
          name: 'Google Pixel 8 Pro', // this can changed
          osVersion: '14.0', // this can changed
        },
        buildPath: 'bs://', // Path to Browserstack url bs:// link release-7.53.0-7.53.0-2223.apk
      },
    },
    {
      name: 'browserstack-ios',
      use: {
        platform: Platform.IOS,
        device: {
          provider: 'browserstack',
          name: 'iPhone 14 Pro Max', // this can changed
          osVersion: '16', // this can changed
        },
        buildPath: 'bs://', // Path to Browserstack url bs:// link //release-7.53.0-7.53.0-2223.ipa
      },
    },
  ],
});
