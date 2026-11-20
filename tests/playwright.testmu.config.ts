import { ProviderName, Platform } from './framework/types';
import { defineConfig } from './framework/config';

/**
 * Playwright config for TestMu AI HyperExecute performance runs.
 * Cloud performance tests are Android-only and live here, separate from the
 * local emulator and simulator projects in playwright.config.ts.
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
      testIgnore: '**/scenarios/**',
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
      testIgnore: [
        '**/performance/onboarding/seedless-*.spec.ts',
        '**/scenarios/**',
      ],
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
      name: 'testmu-android-dev-onboarding',
      testMatch: '**/performance/dev-onboarding/**/*.spec.ts',
      testIgnore: '**/scenarios/**',
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
      testIgnore: '**/scenarios/**',
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
    // Agent-driven scenarios. Project grep replaces the top-level @Performance
    // grep, and testMatch keeps each build on its own app URL.
    {
      name: 'scenario-shadow-testmu-android',
      testMatch: '**/performance/login/scenarios/*.scenario.spec.ts',
      grep: /@PerformanceShadow\b/,
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
      name: 'scenario-shadow-testmu-android-onboarding',
      testMatch:
        '**/performance/onboarding/scenarios/scenarios.scenario.spec.ts',
      grep: /@PerformanceShadow\b/,
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
      name: 'scenario-shadow-testmu-android-onboarding-seedless',
      testMatch:
        '**/performance/onboarding/scenarios/seedless.scenario.spec.ts',
      grep: /@PerformanceShadow\b/,
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
