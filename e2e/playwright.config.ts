import { Platform } from './framework/types';
import { defineConfig } from './framework/config';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  reporter: [
    ['html', { open: 'never' }],
    ['./framework/reporter/PerformanceReporter.ts'],
  ],
  use: {
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'dummy-test-local',
      testMatch: 'tests/dumy.spec.ts',
      use: {
        platform: Platform.ANDROID,
        device: {
          provider: 'emulator',
          name: 'Pixel_5_Pro_API_34',
          osVersion: '14', // 14 for local testing
          packageName: 'io.metamask',
        },
        buildPath: 'PATH-TO-BUILD', // Path to your .apk file
        launchableActivity: 'io.metamask.MainActivity',
      },
    },
    {
      name: 'dummy-test-browserstack',
      testDir: './performance',
      testMatch: 'login.spec.ts',
      use: {
        platform: Platform.ANDROID,
        device: {
          provider: 'browserstack',
          name: 'Samsung Galaxy S23 Ultra',
          osVersion: '13',
        },
        buildPath: process.env.BROWSERSTACK_ANDROID_APP_URL, // Path to Browserstack url
        launchableActivity: 'io.metamask.MainActivity',
      },
    },
  ],
});
