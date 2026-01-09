/** @type {Detox.DetoxConfig} */
const fs = require('fs');

// ---------------------------------------------------------
// CONSTANTS & PATHS (DRY Refactoring)
// ---------------------------------------------------------
const IS_CI = process.env.CI === 'true';
const BUILD_TYPE = process.env.METAMASK_BUILD_TYPE || 'main';

// iOS Paths
const IOS_DERIVED_DATA = 'ios/build/Build/Products';
const IOS_APP_NAME = 'MetaMask.app';
const IOS_FLASK_APP_NAME = 'MetaMask-Flask.app';

// Android Paths
const ANDROID_OUTPUT_DIR = 'android/app/build/outputs/apk';

/**
 * Helper to resolve binary paths with environment override support
 */
const getBinaryPath = (platform, flavor, buildType, isTest = false) => {
  if (platform === 'ios') {
    const appName = flavor === 'flask' ? IOS_FLASK_APP_NAME : IOS_APP_NAME;
    const config = buildType === 'release' ? 'Release-iphonesimulator' : 'Debug-iphonesimulator';
    return process.env.PREBUILT_IOS_APP_PATH || `${IOS_DERIVED_DATA}/${config}/${appName}`;
  }
  
  if (platform === 'android') {
    const pathType = isTest ? 'androidTest' : 'apk';
    const suffix = isTest ? '-androidTest.apk' : '.apk';
    const buildFolder = buildType === 'release' ? 'release' : 'debug';
    // folder structure: .../prod/debug/app-prod-debug.apk
    const flavorDir = flavor === 'flask' ? 'flask' : 'prod'; 
    
    return isTest 
      ? process.env.PREBUILT_ANDROID_TEST_APK_PATH || `${ANDROID_OUTPUT_DIR}/androidTest/${flavorDir}/${buildFolder}/app-${flavorDir}-${buildFolder}${suffix}`
      : process.env.PREBUILT_ANDROID_APK_PATH || `${ANDROID_OUTPUT_DIR}/${flavorDir}/${buildFolder}/app-${flavorDir}-${buildFolder}${suffix}`;
  }
};

module.exports = {
  artifacts: {
    rootDir: "./e2e/artifacts",
    plugins: {
      screenshot: {
        shouldTakeAutomaticSnapshots: true,
        keepOnlyFailedTestsArtifacts: true,
        takeWhen: {
          testStart: false,
          testDone: false, 
          // Capture failure explicitly handled by 'keepOnlyFailedTestsArtifacts'
        },
      },
      video: {
        // OPTIMIZATION: Video recording consumes high CPU/IO. 
        // Enable on CI only if strictly necessary, or keep local for debugging.
        enabled: true, 
        keepOnlyFailedTestsArtifacts: true, 
        // android: { bitRate: 4000000 } // Lower bitrate saves storage/bandwidth
      },
      uiHierarchy: 'enabled', // Extremely useful for debugging "view not found" errors
    },
  },
  testRunner: {
    args: {
      $0: 'jest',
      config: 'e2e/jest.e2e.config.js',
      // OPTIMIZATION: Force 1 worker in CI to prevent race conditions on the simulator/emulator
      maxWorkers: IS_CI ? 1 : undefined, 
    },
    detached: IS_CI,
    jest: {
      setupTimeout: 220000,
      teardownTimeout: 60000,
    },
    retries: IS_CI ? 1 : 0,
  },
  configurations: {
    // --- iOS Configurations ---
    'ios.sim.apiSpecs': {
      device: 'ios.simulator',
      app: IS_CI ? `ios.${BUILD_TYPE}.release` : 'ios.debug',
      testRunner: {
        args: {
          "$0": "node e2e/api-specs/run-api-spec-tests.js",
        },
      },
    },
    'ios.sim.main': {
      device: 'ios.simulator',
      app: 'ios.debug',
    },
    'ios.sim.flask': {
      device: 'ios.simulator',
      app: 'ios.flask.debug',
    },
    'ios.sim.main.ci': {
      device: 'ios.simulator',
      app: 'ios.main.release',
    },
    'ios.sim.flask.ci': {
      device: 'ios.simulator',
      app: 'ios.flask.release',
    },

    // --- Android Configurations ---
    'android.emu.main': {
      device: 'android.emulator',
      app: 'android.debug',
    },
    'android.emu.flask': {
      device: 'android.emulator',
      app: 'android.flask.debug',
    },
    'android.emu.main.ci': {
      device: 'android.github_ci.emulator',
      app: 'android.release',
    },
    'android.emu.flask.ci': {
      device: 'android.github_ci.emulator',
      app: 'android.flask.release',
    },
  },
  devices: {
    'ios.simulator': {
      type: 'ios.simulator',
      device: {
        type: 'iPhone 15 Pro',
      },
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
        avdName: 'emulator',
      },
      // CRITICAL FIX: Reduced memory from 12GB to 4GB.
      // Standard GitHub Runners have ~7GB RAM total. 
      // Allocating 12GB will cause immediate OOM Kills or swap thrashing.
      // Added -no-window for headless stability (though often handled by action).
      bootArgs: '-skin 1080x2340 -memory 4096 -cores 4 -gpu swiftshader_indirect -no-audio -no-boot-anim -partition-size 4096 -no-snapshot -cache-size 1024 -accel on -wipe-data -read-only -no-window',      
      forceAdbInstall: true,
      gpuMode: 'swiftshader_indirect',
    },
    'android.bitrise.emulator': {
      type: 'android.emulator',
      device: {
        avdName: 'emulator',
      },
      bootArgs: '-verbose -show-kernel -no-audio -netdelay none -no-snapshot -wipe-data -gpu auto -no-window -no-boot-anim -read-only',
      forceAdbInstall: true,
    }
  },
  apps: {
    // iOS Apps
    'ios.debug': {
      type: 'ios.app',
      binaryPath: getBinaryPath('ios', 'main', 'debug'),
      build: 'export CONFIGURATION="Debug" && yarn build:ios:main:e2e',
    },
    'ios.main.release': {
      type: 'ios.app',
      binaryPath: getBinaryPath('ios', 'main', 'release'),
      build: `export CONFIGURATION="Release" && yarn build:ios:main:e2e`,
    },
    'ios.flask.debug': {
      type: 'ios.app',
      binaryPath: getBinaryPath('ios', 'flask', 'debug'),
      build: 'export CONFIGURATION="Debug" && yarn build:ios:flask:e2e',
    },
    'ios.flask.release': {
      type: 'ios.app',
      binaryPath: getBinaryPath('ios', 'flask', 'release'),
      build: `export CONFIGURATION="Release" && yarn build:ios:flask:e2e`,
    },

    // Android Apps
    'android.debug': {
      type: 'android.apk',
      binaryPath: getBinaryPath('android', 'prod', 'debug'),
      testBinaryPath: getBinaryPath('android', 'prod', 'debug', true),
      build: 'export CONFIGURATION="Debug" && yarn build:android:main:e2e',
    },
    'android.release': {
      type: 'android.apk',
      binaryPath: getBinaryPath('android', 'prod', 'release'),
      testBinaryPath: getBinaryPath('android', 'prod', 'release', true),
      build: `export CONFIGURATION="Release" && yarn build:android:main:e2e`,
    },
    'android.flask.debug': {
      type: 'android.apk',
      binaryPath: getBinaryPath('android', 'flask', 'debug'),
      testBinaryPath: getBinaryPath('android', 'flask', 'debug', true),
      build: 'export CONFIGURATION="Debug" && yarn build:android:flask:e2e',
    },
    'android.flask.release': {
      type: 'android.apk',
      binaryPath: getBinaryPath('android', 'flask', 'release'),
      testBinaryPath: getBinaryPath('android', 'flask', 'release', true),
      build: `export CONFIGURATION="Release" && yarn build:android:flask:e2e`,
    },
  },
};
