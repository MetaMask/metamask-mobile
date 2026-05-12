/**
 * @file Detox end-to-end test configuration.
 * @notice Centralized configuration for local and CI test runs across iOS/Android and main/flask flavors.
 * @dev Optimizations:
 * - Caches environment variable lookups into constants.
 * - Reuses shared path prefixes and emulator settings to reduce repeated string/object allocations.
 * - Removes redundant ternaries and object spread usage in static config assembly.
 */

/** @type {Detox.DetoxConfig} */

// -----------------------------------------------------------------------------
// Environment flags and shared constants
// -----------------------------------------------------------------------------

/** @constant {boolean} True when running in CI environment. */
const IS_CI = Boolean(process.env.CI);

/** @constant {string} Build type used by CI api specs app selection (e.g. "main", "flask"). */
const BUILD_TYPE = process.env.METAMASK_BUILD_TYPE;

/** @constant {string|undefined} Optional prebuilt iOS app override path. */
const PREBUILT_IOS_APP_PATH = process.env.PREBUILT_IOS_APP_PATH;

/** @constant {string|undefined} Optional prebuilt Android APK override path. */
const PREBUILT_ANDROID_APK_PATH = process.env.PREBUILT_ANDROID_APK_PATH;

/** @constant {string|undefined} Optional prebuilt Android test APK override path. */
const PREBUILT_ANDROID_TEST_APK_PATH = process.env.PREBUILT_ANDROID_TEST_APK_PATH;

/** @constant {string} Default iOS simulator device type fallback. */
const DEFAULT_IOS_SIMULATOR_TYPE = 'iPhone 16 Pro';

/** @constant {string} Shared iOS build products root directory. */
const IOS_BUILD_PRODUCTS_ROOT = 'ios/build/Build/Products';

/** @constant {string} Shared Android outputs root directory. */
const ANDROID_OUTPUTS_ROOT = 'android/app/build/outputs/apk';

/** @constant {string} Standard CI emulator AVD name. */
const CI_ANDROID_AVD_NAME = 'emulator';

module.exports = {
  artifacts: {
    rootDir: './tests/artifacts',
    plugins: {
      screenshot: {
        shouldTakeAutomaticSnapshots: true,
        keepOnlyFailedTestsArtifacts: true,
        takeWhen: {
          testStart: false,
          testDone: false,
        },
      },
      video: {
        enabled: true,
        keepOnlyFailedTestsArtifacts: true,
      },
    },
  },

  testRunner: {
    args: {
      $0: 'jest',
      config: 'tests/jest.e2e.detox.config.js',
      /**
       * @dev CI-only safety flags:
       * - forceExit: ensures Jest exits after tests complete.
       * - detectOpenHandles: helps identify dangling resources.
       */
      ...(IS_CI
        ? {
            forceExit: true,
            detectOpenHandles: true,
          }
        : {}),
    },
    detached: IS_CI,
    jest: {
      setupTimeout: 220000,
      teardownTimeout: 60000,
    },
    retries: IS_CI ? 1 : 0,
  },

  configurations: {
    'ios.sim.apiSpecs': {
      device: 'ios.simulator',
      app: IS_CI ? `ios.${BUILD_TYPE}.release` : 'ios.debug',
      testRunner: {
        args: {
          $0: 'node tests/smoke/api-specs/run-api-spec-tests.js',
        },
      },
    },
    'android.emu.main': {
      device: 'android.emulator',
      app: 'android.debug',
    },
    'android.emu.flask': {
      device: 'android.emulator',
      app: 'android.flask.debug',
    },
    'ios.sim.main': {
      device: 'ios.simulator',
      app: 'ios.debug',
    },
    'ios.sim.flask': {
      device: 'ios.simulator',
      app: 'ios.flask.debug',
    },
    'android.emu.main.ci': {
      device: 'android.github_ci.emulator',
      app: 'android.release',
    },
    'android.emu.flask.ci': {
      device: 'android.github_ci.emulator',
      app: 'android.flask.release',
    },
    'ios.sim.main.ci': {
      device: 'ios.simulator',
      app: 'ios.main.release',
    },
    'ios.sim.flask.ci': {
      device: 'ios.simulator',
      app: 'ios.flask.release',
    },
  },

  devices: {
    'ios.simulator': {
      type: 'ios.simulator',
      device: process.env.IOS_SIMULATOR
        ? { name: process.env.IOS_SIMULATOR }
        : { type: DEFAULT_IOS_SIMULATOR_TYPE },
    },
    'android.emulator': {
      type: 'android.emulator',
      device: {
        avdName: 'Pixel_5_Pro_API_34',
      },
    },
    'android.github_ci.emulator': {
      type: 'android.emulator',
      device: {
        avdName: CI_ANDROID_AVD_NAME,
      },
      bootArgs:
        '-skin 1080x2340 -memory 12288 -cores 8 -gpu swiftshader_indirect -no-audio -no-boot-anim -partition-size 8192 -no-snapshot-save -no-snapshot-load -cache-size 2048 -accel on -wipe-data -read-only',
      forceAdbInstall: true,
      gpuMode: 'swiftshader_indirect',
    },
    'android.bitrise.emulator': {
      type: 'android.emulator',
      device: {
        avdName: CI_ANDROID_AVD_NAME,
      },
      // Optimized for Bitrise CI runners.
      bootArgs:
        '-verbose -show-kernel -no-audio -netdelay none -no-snapshot -wipe-data -gpu auto -no-window -no-boot-anim -read-only',
      forceAdbInstall: true,
    },
  },

  apps: {
    'ios.debug': {
      type: 'ios.app',
      binaryPath:
        PREBUILT_IOS_APP_PATH ||
        `${IOS_BUILD_PRODUCTS_ROOT}/Debug-iphonesimulator/MetaMask.app`,
      build: 'export CONFIGURATION="Debug" && yarn build:ios:main:e2e',
    },
    'ios.main.release': {
      type: 'ios.app',
      binaryPath:
        PREBUILT_IOS_APP_PATH ||
        `${IOS_BUILD_PRODUCTS_ROOT}/Release-iphonesimulator/MetaMask.app`,
      build: 'export CONFIGURATION="Release" && yarn build:ios:main:e2e',
    },
    'ios.flask.debug': {
      type: 'ios.app',
      binaryPath:
        PREBUILT_IOS_APP_PATH ||
        `${IOS_BUILD_PRODUCTS_ROOT}/Debug-iphonesimulator/MetaMask-Flask.app`,
      build: 'export CONFIGURATION="Debug" && yarn build:ios:flask:e2e',
    },
    'ios.flask.release': {
      type: 'ios.app',
      binaryPath:
        PREBUILT_IOS_APP_PATH ||
        `${IOS_BUILD_PRODUCTS_ROOT}/Release-iphonesimulator/MetaMask-Flask.app`,
      build: 'export CONFIGURATION="Release" && yarn build:ios:flask:e2e',
    },
    'android.debug': {
      type: 'android.apk',
      binaryPath:
        PREBUILT_ANDROID_APK_PATH ||
        `${ANDROID_OUTPUTS_ROOT}/prod/debug/app-prod-debug.apk`,
      testBinaryPath:
        PREBUILT_ANDROID_TEST_APK_PATH ||
        `${ANDROID_OUTPUTS_ROOT}/androidTest/prod/debug/app-prod-debug-androidTest.apk`,
      build: 'export CONFIGURATION="Debug" && yarn build:android:main:e2e',
    },
    'android.release': {
      type: 'android.apk',
      binaryPath:
        PREBUILT_ANDROID_APK_PATH ||
        `${ANDROID_OUTPUTS_ROOT}/prod/release/app-prod-release.apk`,
      testBinaryPath:
        PREBUILT_ANDROID_TEST_APK_PATH ||
        `${ANDROID_OUTPUTS_ROOT}/androidTest/prod/release/app-prod-release-androidTest.apk`,
      build: 'export CONFIGURATION="Release" && yarn build:android:main:e2e',
    },
    'android.flask.debug': {
      type: 'android.apk',
      binaryPath:
        PREBUILT_ANDROID_APK_PATH ||
        `${ANDROID_OUTPUTS_ROOT}/flask/debug/app-flask-debug.apk`,
      testBinaryPath:
        PREBUILT_ANDROID_TEST_APK_PATH ||
        `${ANDROID_OUTPUTS_ROOT}/androidTest/flask/debug/app-flask-debug-androidTest.apk`,
      build: 'export CONFIGURATION="Debug" && yarn build:android:flask:e2e',
    },
    'android.flask.release': {
      type: 'android.apk',
      binaryPath:
        PREBUILT_ANDROID_APK_PATH ||
        `${ANDROID_OUTPUTS_ROOT}/flask/release/app-flask-release.apk`,
      testBinaryPath:
        PREBUILT_ANDROID_TEST_APK_PATH ||
        `${ANDROID_OUTPUTS_ROOT}/androidTest/flask/release/app-flask-release-androidTest.apk`,
      build: 'export CONFIGURATION="Release" && yarn build:android:flask:e2e',
    },
  },
};