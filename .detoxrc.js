/** @type {Detox.DetoxConfig} */
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
        },
      },
      video: {
        enabled: true,  // Enable video recording
        keepOnlyFailedTestsArtifacts: true,  // Keep only failed tests' videos
      },
    },
  },
  testRunner: {
    args: {
      $0: 'jest',
      config: 'e2e/jest.e2e.config.js',
      // CI only: Force Jest to exit after all tests complete, preventing indefinite hangs
      // from open handles (sockets, timers). Also detect what's keeping Jest open.
      ...({
        forceExit: true,
        detectOpenHandles: true,
      }),
    },
    detached: process.env.CI ? true : false,
    jest: {
      setupTimeout: 220000,
      teardownTimeout: 60000, // Increase teardown timeout from default 30s to 60s
    },
    retries: process.env.CI ? 1 : 0,
  },
  configurations: {
    'ios.sim.apiSpecs': {
      device: 'ios.simulator',
      app: process.env.CI ? `ios.${process.env.METAMASK_BUILD_TYPE}.release` : 'ios.debug',
      testRunner: {
        args: {
          "$0": "node tests/smoke/api-specs/run-api-spec-tests.js",
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
      device: {
        type: 'iPhone 16e',
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
      bootArgs: '-skin 1080x2340 -memory 12288 -cores 8 -gpu swiftshader_indirect -no-audio -no-boot-anim -partition-size 8192 -no-snapshot-save -no-snapshot-load -cache-size 2048 -accel on -wipe-data -read-only',      
      forceAdbInstall: true,
      gpuMode: 'swiftshader_indirect',
    },
    'android.bitrise.emulator': {
      type: 'android.emulator',
      device: {
        avdName: 'emulator',
      },
      // optimized for Bitrise CI runners
      bootArgs: '-verbose -show-kernel -no-audio -netdelay none -no-snapshot -wipe-data -gpu auto -no-window -no-boot-anim -read-only',
      forceAdbInstall: true,
    }
  },
  apps: {
    'ios.debug': {
      type: 'ios.app',
      binaryPath:
        process.env.PREBUILT_IOS_APP_PATH || 'ios/build/Build/Products/Debug-iphonesimulator/MetaMask.app',
      build: 'export CONFIGURATION="Debug" && yarn build:ios:main:e2e',
    },
    'ios.main.release': {
      type: 'ios.app',
      binaryPath:
        process.env.PREBUILT_IOS_APP_PATH || 'ios/build/Build/Products/Release-iphonesimulator/MetaMask.app',
      build: `export CONFIGURATION="Release" && yarn build:ios:main:e2e`,
    },
    'ios.flask.debug': {
      type: 'ios.app',
      binaryPath:
        process.env.PREBUILT_IOS_APP_PATH || 'ios/build/Build/Products/Debug-iphonesimulator/MetaMask-Flask.app',
        build: 'export CONFIGURATION="Debug" && yarn build:ios:flask:e2e',
    },
    'ios.flask.release': {
      type: 'ios.app',
      binaryPath:
        process.env.PREBUILT_IOS_APP_PATH || 'ios/build/Build/Products/Release-iphonesimulator/MetaMask-Flask.app',
      build: `export CONFIGURATION="Release" && yarn build:ios:flask:e2e`,
    },
    'android.debug': {
      type: 'android.apk',
      binaryPath: process.env.PREBUILT_ANDROID_APK_PATH || 'android/app/build/outputs/apk/prod/debug/app-prod-debug.apk',
      testBinaryPath: process.env.PREBUILT_ANDROID_TEST_APK_PATH || 'android/app/build/outputs/apk/androidTest/prod/debug/app-prod-debug-androidTest.apk',
      build: 'export CONFIGURATION="Debug" && yarn build:android:main:e2e',
    },
    'android.release': {
      type: 'android.apk',
      binaryPath: process.env.PREBUILT_ANDROID_APK_PATH || 'android/app/build/outputs/apk/prod/release/app-prod-release.apk',
      testBinaryPath: process.env.PREBUILT_ANDROID_TEST_APK_PATH || 'android/app/build/outputs/apk/androidTest/prod/release/app-prod-release-androidTest.apk',
      build: `export CONFIGURATION="Release" && yarn build:android:main:e2e`,
    },
    'android.flask.debug': {
      type: 'android.apk',
      binaryPath: process.env.PREBUILT_ANDROID_APK_PATH || 'android/app/build/outputs/apk/flask/debug/app-flask-debug.apk',
      testBinaryPath: process.env.PREBUILT_ANDROID_TEST_APK_PATH || 'android/app/build/outputs/apk/androidTest/flask/debug/app-flask-debug-androidTest.apk',
      build: 'export CONFIGURATION="Debug" && yarn build:android:flask:e2e',
    },
    'android.flask.release': {
      type: 'android.apk',
      binaryPath: process.env.PREBUILT_ANDROID_APK_PATH || 'android/app/build/outputs/apk/flask/release/app-flask-release.apk',
      testBinaryPath: process.env.PREBUILT_ANDROID_TEST_APK_PATH || 'android/app/build/outputs/apk/androidTest/flask/release/app-flask-release-androidTest.apk',
      build: `export CONFIGURATION="Release" && yarn build:android:flask:e2e`,
    },
  },
};
