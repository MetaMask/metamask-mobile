/** @type {Detox.DetoxConfig} */
module.exports = {
  artifacts: {
    rootDir: "./artifacts",
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
    },
    jest: {
      setupTimeout: 220000,
    },
    retries: 1,
  },
  configurations: {
    'ios.sim.apiSpecs': {
      device: 'ios.simulator',
      app: process.env.CI ? `ios.${process.env.METAMASK_BUILD_TYPE}.release` : 'ios.debug',
      testRunner: {
        args: {
          "$0": "node e2e/api-specs/run-api-spec-tests.js",
        },
      },
    },
    'ios.sim.debug': {
      device: 'ios.simulator',
      app: 'ios.debug',
    },
    'ios.sim.main.release': {
      device: 'ios.simulator',
      app: 'ios.main.release',
    },
    'ios.sim.flask.release': {
      device: 'ios.simulator',
      app: 'ios.flask.release',
    },
    'ios.github_ci.main.release': {
      device: 'ios.github_ci.simulator',
      app: 'ios.debug',
    },
    'android.emu.debug': {
      device: 'android.emulator',
      app: 'android.debug',
    },
    'android.emu.release': {
      device: 'android.bitrise.emulator',
      app: 'android.release',
    },
    'android.github_ci.release': {
      device: 'android.github_ci.emulator',
      app: 'android.release',
    },
    'android.emu.flask.release': {
      device: 'android.bitrise.emulator',
      app: 'android.flask.release',
    },
  },
  devices: {
    'ios.simulator': {
      type: 'ios.simulator',
      device: {
        type: 'iPhone 16 Pro',
        os: 'iOS 18.6',
      },
    },
    'ios.github_ci.simulator': {
      type: 'ios.simulator',
      device: {
        type: 'iPhone 16 Pro',
        os: 'iOS 18.6',
      },
    },
    'android.bitrise.emulator': {
      type: 'android.emulator',
      device: {
        avdName: 'emulator',
      },
      // optimized for Bitrise CI runners
      bootArgs: '-verbose -show-kernel -no-audio -netdelay none -no-snapshot -wipe-data -gpu auto -no-window -no-boot-anim -read-only',
      forceAdbInstall: true,
    },
    'android.github_ci.emulator': {
      type: 'android.emulator',
      device: {
        avdName: 'emulator',
      },
      // optimized for GitHub Actions CI runners
      bootArgs: '-skin 1080x2340 -memory 6144 -cores 4 -gpu swiftshader_indirect -no-audio -no-boot-anim -partition-size 4096 -no-snapshot-save -no-snapshot-load -cache-size 1024 -accel on -wipe-data -read-only',
      forceAdbInstall: true,
      gpuMode: 'swiftshader_indirect',
    },
    'android.emulator': {
      type: 'android.emulator',
      device: {
        avdName: 'Pixel_5_Pro_API_34',
      },
    },
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
        'ios/build/Build/Products/Release-iphonesimulator/MetaMask.app',
      build: `yarn build:ios:main:e2e`,
    },
    'ios.flask.release': {
      type: 'ios.app',
      binaryPath:
        'ios/build/Build/Products/Release-iphonesimulator/MetaMask-Flask.app',
      build: `yarn build:ios:flask:e2e`,
    },
    'android.debug': {
      type: 'android.apk',
      binaryPath: process.env.PREBUILT_ANDROID_APK_PATH || 'android/app/build/outputs/apk/prod/debug/app-prod-debug.apk',
      testBinaryPath: process.env.PREBUILT_ANDROID_TEST_APK_PATH,
      build: 'yarn start:android:e2e',
    },
    'android.release': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/prod/release/app-prod-release.apk',
      build: `yarn build:android:main:e2e`,
    },
    'android.flask.release': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/flask/release/app-flask-release.apk',
      build: `yarn build:android:flask:e2e`,
    },
  },
};
