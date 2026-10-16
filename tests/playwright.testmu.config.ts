import { ProviderName, Platform } from './framework/types';
import { defineConfig } from './framework/config';

/**
 * Playwright config for TestMu AI HyperExecute performance runs.
 * Separate from playwright.config.ts so the BrowserStack projects stay unchanged.
 * Android only: iOS performance builds are still supplied as BrowserStack URLs.
 */
export default defineConfig({
  testDir: './',
  fullyParallel: false,
  workers: process.env.PLAYWRIGHT_WORKERS
    ? parseInt(process.env.PLAYWRIGHT_WORKERS, 10)
    : 1,
  timeout: 7 * 60 * 1000,
  // Keep in sync with playwright.config.ts.
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
      name: 'testmu-android',
      testMatch: '**/performance/login/**/*.spec.ts',
      use: {
        platform: Platform.ANDROID,
        device: {
          provider: ProviderName.TESTMU,
          name: process.env.TESTMU_DEVICE || 'Pixel 8 Pro',
          osVersion: process.env.TESTMU_OS_VERSION || '14',
        },
        app: {
          packageName: 'io.metamask',
          launchableActivity: 'io.metamask.MainActivity',
          buildPath: process.env.TESTMU_ANDROID_APP_URL,
        },
      },
    },
    {
      name: 'testmu-android-onboarding',
      testMatch: '**/performance/onboarding/**/*.spec.ts',
      testIgnore: '**/performance/onboarding/seedless-*.spec.ts',
      use: {
        platform: Platform.ANDROID,
        device: {
          provider: ProviderName.TESTMU,
          name: process.env.TESTMU_DEVICE || 'Pixel 8 Pro',
          osVersion: process.env.TESTMU_OS_VERSION || '14',
        },
        app: {
          packageName: 'io.metamask',
          launchableActivity: 'io.metamask.MainActivity',
          buildPath:
            process.env.TESTMU_ANDROID_ONBOARDING_PERF_APP_URL ??
            process.env.TESTMU_ANDROID_CLEAN_APP_URL,
        },
      },
    },
    {
      name: 'testmu-android-onboarding-seedless',
      testMatch: '**/performance/onboarding/seedless-*.spec.ts',
      use: {
        platform: Platform.ANDROID,
        device: {
          provider: ProviderName.TESTMU,
          name: process.env.TESTMU_DEVICE || 'Pixel 8 Pro',
          osVersion: process.env.TESTMU_OS_VERSION || '14',
        },
        app: {
          packageName: 'io.metamask',
          launchableActivity: 'io.metamask.MainActivity',
          buildPath:
            process.env.TESTMU_ANDROID_SEEDLESS_PERF_APP_URL ??
            process.env.TESTMU_ANDROID_CLEAN_APP_URL,
        },
      },
    },
  ],
});
