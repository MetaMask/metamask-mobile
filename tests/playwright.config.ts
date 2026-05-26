import { ProviderName, Platform } from './framework/types';
import { defineConfig } from './framework/config';

export default defineConfig({
  testDir: './',
  fullyParallel: false,
  timeout: 7 * 60 * 1000, //7 minutes until we introduce fixtures
  grep: /@Performance/,
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
      // Browserstack does not support appium 3 just yet.
      name: 'browserstack-android',
      testMatch: '**/performance/login/**/perps-add-funds.spec.ts',
      use: {
        platform: Platform.ANDROID,
        device: {
          provider: ProviderName.BROWSERSTACK,
          name: process.env.BROWSERSTACK_DEVICE || 'Samsung Galaxy S25 Ultra', // this can changed
          osVersion: process.env.BROWSERSTACK_OS_VERSION || '15.0', // this can changed
        },
        app: {
          packageName: 'io.metamask',
          launchableActivity: 'io.metamask.MainActivity',
          buildPath: 'bs://cb6e4a3246a4d9ae7955c863f76259feefb0b63f', // Path to Browserstack url
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
          osVersion: '18.4',
          name: 'iPhone 16 Pro',
        },
        app: {
          appId: 'io.metamask.MetaMask',
          buildPath:
            './ios/build/Build/Products/Debug-iphonesimulator/MetaMask.app', // Path to your .app file
        },
      },
    },
    {
      name: 'browserstack-ios',
      testMatch: '**/performance/login/**/uniswap-interaction.spec.ts',
      use: {
        platform: Platform.IOS,
        device: {
          provider: ProviderName.BROWSERSTACK,
          name: process.env.BROWSERSTACK_DEVICE || 'iPhone 12',
          osVersion: process.env.BROWSERSTACK_OS_VERSION || '17.0',
        },
        app: {
          appId: 'io.metamask.MetaMask',
          buildPath: 'bs://adf3c6163676adb9a6595ea251caee5ba468bad9',
        },
      },
    },

    {
      name: 'android-onboarding',
      testMatch:
        '**/performance/onboarding/**/cold-start-after-wallet-import.spec.ts',
      //testIgnore: '**/performance/onboarding/seedless-*.spec.ts',

      use: {
        platform: Platform.ANDROID,
        device: {
          provider: ProviderName.BROWSERSTACK,
          name: process.env.BROWSERSTACK_DEVICE || 'Samsung Galaxy S25 Ultra',
          osVersion: process.env.BROWSERSTACK_OS_VERSION || '15.0',
        },
        app: {
          packageName: 'io.metamask',
          launchableActivity: 'io.metamask.MainActivity',
          buildPath: 'bs://c3fbabe9d19d02c8fc4a81cc206b39801718c265',
        },
      },
    },
    {
      name: 'ios-onboarding',
      testMatch:
        '**/performance/onboarding/**/perps-position-management.spec.ts',
      use: {
        platform: Platform.IOS,
        device: {
          provider: ProviderName.BROWSERSTACK,
          name: process.env.BROWSERSTACK_DEVICE || 'iPhone 16 Pro Max',
          osVersion: process.env.BROWSERSTACK_OS_VERSION || '18.0',
        },
        app: {
          appId: 'io.metamask.MetaMask',
          buildPath: 'bs://0c13eadb498365a49d6b9b6034aea0046270235a',
        },
      },
    },
    {
      name: 'mm-connect-ios-browserstack',
      testMatch: '**/performance/mm-connect/**/*.spec.ts',
      use: {
        platform: Platform.IOS,
        device: {
          provider: ProviderName.BROWSERSTACK,
          name: process.env.BROWSERSTACK_DEVICE || 'iPhone 14 Pro Max',
          osVersion: process.env.BROWSERSTACK_OS_VERSION || '16.0',
        },
        app: {
          appId: 'io.metamask.MetaMask',
          buildPath: 'bs://a0ea40650b0a1108e32b27ec93ac73af3b393855', // Just a demo, CI will take care of this
        },
      },
    },
    {
      name: 'mm-connect-ios-local',
      testMatch: '**/performance/mm-connect/**/*.spec.ts',
      use: {
        platform: Platform.IOS,
        device: {
          provider: ProviderName.EMULATOR,
          osVersion: '16.0', // this can be changed to your simulator version
          name: 'iPhone 16 Pro',
        },
        app: {
          appId: 'io.metamask.MetaMask',
          buildPath: 'PATH-TO-BUILD', // Path to your .app file
        },
      },
    },
    {
      name: 'mm-connect-android-browserstack',
      testMatch: '**/performance/mm-connect/**/*.spec.ts',
      timeout: 12 * 60 * 1000,
      use: {
        platform: Platform.ANDROID,
        device: {
          provider: ProviderName.BROWSERSTACK,
          name: process.env.BROWSERSTACK_DEVICE || 'Samsung Galaxy S25 Ultra', // this can changed
          osVersion: process.env.BROWSERSTACK_OS_VERSION || '15.0', // this can changed
          selfHeal: false,
          otherApps: process.env.BROWSERSTACK_RN_PLAYGROUND_URL
            ? [process.env.BROWSERSTACK_RN_PLAYGROUND_URL]
            : [],
        },
        app: {
          packageName: 'io.metamask',
          launchableActivity: 'io.metamask.MainActivity',
          buildPath: process.env.BROWSERSTACK_ANDROID_APP_URL, // Path to Browserstack url
        },
      },
    },
    {
      name: 'mm-connect-android-local',
      testMatch: '**/performance/mm-connect/**/*.spec.ts',
      timeout: 12 * 60 * 1000,
      use: {
        platform: Platform.ANDROID,
        device: {
          provider: ProviderName.EMULATOR,
          name: 'Samsung_Galaxy_S24_Ultra', // must match `emulator -list-avds`
          osVersion: '14', // this can be changed to your emulator version
        },
        app: {
          packageName: 'io.metamask',
          launchableActivity: 'io.metamask.MainActivity',
          buildPath: 'PATH-TO-BUILD', // Path to your .apk file
        },
      },
    },
    {
      name: 'android-onboarding-seedless',
      testMatch: '**/performance/onboarding/seedless-*.spec.ts',
      use: {
        platform: Platform.ANDROID,
        device: {
          provider: ProviderName.BROWSERSTACK,
          name: process.env.BROWSERSTACK_DEVICE || 'Samsung Galaxy S25 Ultra',
          osVersion: process.env.BROWSERSTACK_OS_VERSION || '15.0',
        },
        app: {
          packageName: 'io.metamask',
          launchableActivity: 'io.metamask.MainActivity',
          buildPath:
            process.env.BROWSERSTACK_ANDROID_SEEDLESS_PERF_APP_URL ??
            process.env.BROWSERSTACK_ANDROID_CLEAN_APP_URL,
        },
      },
    },
    {
      name: 'ios-onboarding-seedless',
      testMatch: '**/performance/onboarding/seedless-*.spec.ts',
      use: {
        platform: Platform.IOS,
        device: {
          provider: ProviderName.BROWSERSTACK,
          name: process.env.BROWSERSTACK_DEVICE || 'iPhone 14 Pro Max',
          osVersion: process.env.BROWSERSTACK_OS_VERSION || '16.0',
        },
        app: {
          appId: 'io.metamask.MetaMask',
          buildPath:
            process.env.BROWSERSTACK_IOS_SEEDLESS_PERF_APP_URL ??
            process.env.BROWSERSTACK_IOS_CLEAN_APP_URL,
        },
      },
    },
  ],
});
