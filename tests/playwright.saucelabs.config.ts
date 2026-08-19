import { Platform, ProviderName } from './framework/types';
import { defineConfig } from './framework/config';

const device = {
  provider: ProviderName.SAUCELABS,
  name: process.env.SAUCE_DEVICE || 'Google_Pixel_7_POC(49|05)',
};

const app = (buildPath?: string) => ({
  packageName: 'io.metamask',
  launchableActivity: 'io.metamask.MainActivity',
  buildPath,
});

export default defineConfig({
  testDir: './',
  fullyParallel: false,
  workers: Number.parseInt(process.env.SAUCE_WORKERS || '1', 10),
  retries: 0,
  timeout: 7 * 60 * 1000,
  grep: /@Performance\b/,
  reporter: [
    [
      'html',
      { open: 'never', outputFolder: './test-reports/playwright-report' },
    ],
    ['./reporters/PerformanceReporter.ts'],
    ['list'],
  ],
  use: { trace: 'on-first-retry' },
  projects: [
    {
      name: 'saucelabs-android',
      testMatch: '**/performance/login/**/*.spec.ts',
      use: {
        platform: Platform.ANDROID,
        device,
        app: app(process.env.SAUCE_ANDROID_APP_URL),
      },
    },
    {
      name: 'saucelabs-android-onboarding',
      testMatch: '**/performance/onboarding/**/*.spec.ts',
      testIgnore: '**/performance/onboarding/seedless-*.spec.ts',
      use: {
        platform: Platform.ANDROID,
        device,
        app: app(
          process.env.SAUCE_ANDROID_ONBOARDING_APP_URL ||
            process.env.SAUCE_ANDROID_CLEAN_APP_URL,
        ),
      },
    },
    {
      name: 'saucelabs-android-onboarding-seedless',
      testMatch: '**/performance/onboarding/seedless-*.spec.ts',
      use: {
        platform: Platform.ANDROID,
        device,
        app: app(
          process.env.SAUCE_ANDROID_SEEDLESS_APP_URL ||
            process.env.SAUCE_ANDROID_CLEAN_APP_URL,
        ),
      },
    },
  ].filter((project) => {
    const buildType = process.env.SAUCE_BUILD_TYPE;
    if (buildType === 'onboarding') {
      return project.name.startsWith('saucelabs-android-onboarding');
    }
    return project.name === 'saucelabs-android';
  }),
});
