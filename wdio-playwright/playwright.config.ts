import { Platform } from '../e2e/framework/types';
import { defineConfig } from './config';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  reporter: [['html', { open: 'never' }]],
  use: {
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'dummy-test',
      testMatch: 'tests/*.spec.ts',
      use: {
        platform: Platform.ANDROID,
        device: {
          provider: 'emulator',
          name: 'Pixel_5_Pro_API_34',
          osVersion: '14',
        },
        buildPath: '/Users/cferreira/Downloads/app-prod-release.apk',
        appBundleId: 'io.metamask',
        launchableActivity: 'io.metamask.MainActivity',
      },
    },
  ],
});
