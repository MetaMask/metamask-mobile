// In appwright.config.ts
import { defineConfig, Platform } from 'appwright';
export default defineConfig({
  testDir: './tests',
  projects: [
    {
      name: 'android',
      use: {
        platform: Platform.ANDROID,
        device: {
          provider: 'emulator', // or 'local-device' or 'browserstack'
        },
        buildPath: 'app-qa-release.apk', // Path to your .apk file
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
        buildPath: 'app-qa-release.apk', // Path to Browserstack url bs:// link
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
        buildPath: '', // Path to Browserstack url bs:// link
      },
    },
  ],
});
