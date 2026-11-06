import { ProviderName, Platform } from './framework/types';
import { defineConfig } from './framework/config';

/**
 * Opt-in config for step-based scenario PoCs (`*.scenario.spec.ts`).
 *
 * No workflow or HyperExecute script references this file, and the other
 * performance configs grep `/@Performance\b/`, which `@PerformanceShadow`
 * does not match. Scenario specs therefore only run when this config is
 * passed explicitly. See tests/performance/login/scenarios/README.md.
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
  ],
});
