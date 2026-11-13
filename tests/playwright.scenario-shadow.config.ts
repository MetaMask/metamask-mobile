import { ProviderName, Platform } from './framework/types';
import { defineConfig } from './framework/config';

/**
 * Config for agent-driven Markdown scenarios (`*.scenario.spec.ts`).
 *
 * The other performance configs grep `/@Performance\b/`, which
 * `@PerformanceShadow` does not match, so scenarios only run through this
 * config. CI reaches it through hyperexecute-run-performance-test.sh when a
 * run selects @PerformanceShadow. See tests/performance/login/scenarios/README.md.
 */
export default defineConfig({
  testDir: './',
  testMatch: '**/performance/**/scenarios/*.scenario.spec.ts',
  fullyParallel: false,
  workers: 1,
  timeout: 7 * 60 * 1000,
  grep: /@PerformanceShadow\b/,
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
      name: 'scenario-shadow-android-emulator',
      use: {
        platform: Platform.ANDROID,
        device: {
          provider: ProviderName.EMULATOR,
          name: process.env.SCENARIO_EMULATOR_NAME || 'Pixel_5_Pro_API_34',
          osVersion: process.env.SCENARIO_EMULATOR_OS_VERSION || '14',
        },
        app: {
          packageName: 'io.metamask',
          launchableActivity: 'io.metamask.MainActivity',
          buildPath: process.env.SCENARIO_ANDROID_BUILD_PATH,
        },
      },
    },
    {
      name: 'scenario-shadow-testmu-android',
      testMatch: '**/performance/login/scenarios/*.scenario.spec.ts',
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
    // Same app and env fallbacks as testmu-android-onboarding(-seedless) in
    // playwright.testmu.config.ts.
    {
      name: 'scenario-shadow-testmu-android-onboarding',
      testMatch: '**/performance/onboarding/scenarios/*.scenario.spec.ts',
      testIgnore:
        '**/performance/onboarding/scenarios/seedless-*.scenario.spec.ts',
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
        '**/performance/onboarding/scenarios/seedless-*.scenario.spec.ts',
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
