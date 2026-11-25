import { ProviderName, Platform } from './framework/types';
import { defineConfig } from './framework/config';

export default defineConfig({
  testDir: './',
  fullyParallel: false,
  workers: process.env.PLAYWRIGHT_WORKERS
    ? parseInt(process.env.PLAYWRIGHT_WORKERS, 10)
    : 3,
  timeout: 7 * 60 * 1000, //7 minutes until we introduce fixtures
  // Bare @Performance only — excludes @System-only specs that use area tags
  // like @PerformanceSwaps without the @Performance type tag.
  grep: /@Performance\b/,
  reporter: [
    [
      'html',
      { open: 'never', outputFolder: './test-reports/playwright-report' },
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
      testMatch: 'tests/performance/fixtures/test.spec.ts', // DEMO TEST USING WITHFIXTURES
      use: {
        platform: Platform.ANDROID,
        device: {
          provider: ProviderName.EMULATOR,
          name: 'Pixel_5_Pro_API_34',
          osVersion: '13', // 14 for local testing
        },
        app: {
          packageName: 'io.metamask',
          launchableActivity: 'io.metamask.MainActivity',
          // buildPath: 'PATH-TO-BUILD', // Path to your .apk file
        },
      },
    },
    {
      name: 'ios',
      testMatch: 'tests/performance/fixtures/test.spec.ts', // DEMO TEST USING WITHFIXTURES
      use: {
        platform: Platform.IOS,
        device: {
          provider: ProviderName.SIMULATOR,
          osVersion: '26.2',
          name: 'iPhone 16 Pro',
          udid: '',
        },
        app: {
          appId: 'io.metamask.MetaMask',
          // buildPath: 'PATH-TO-BUILD', // Path to your .app file
        },
      },
    },
  ],
});
