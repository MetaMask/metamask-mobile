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
        buildPath: 'app-qa-release_2.apk',
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
        buildPath: 'app-release.app', // Path to your .app file
      },
    },
  ],
});
