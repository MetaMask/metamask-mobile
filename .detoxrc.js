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
      app: process.env.CI ? 'ios.qa' :'ios.debug',
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
    'ios.sim.release': {
      device: 'ios.simulator',
      app: 'ios.release',
    },
    'ios.sim.qa': {
      device: 'ios.simulator',
      app: 'ios.qa',
    },
    'ios.sim.flask': {
      device: 'ios.simulator',
      app: 'ios.flask',
    },

    'android.emu.debug': {
      device: 'android.emulator',
      app: 'android.debug',
    },
    'android.emu.release': {
      device: 'android.bitrise.emulator',
      app: 'android.release',
    },
    'android.emu.release.qa': {
      device: 'android.bitrise.emulator',
      app: 'android.qa',
    },
  },
  devices: {
    'ios.simulator': {
      type: 'ios.simulator',
      device: {
        type: 'iPhone 15 Pro',
      },
    },
    'android.bitrise.emulator': {
      type: 'android.emulator',
      device: {
        avdName: 'emulator',
      },
      // to be used by github action runners later on
      // bootArgs: '-skin 1080x2340 -memory 4096 -cores 4 -gpu swiftshader_indirect -no-audio -no-boot-anim -partition-size 4096',
      // forceAdbInstall: true,
      // gpuMode: 'swiftshader_indirect',
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
      build: 'yarn start:ios:e2e',
    },
    'ios.qa': {
      type: 'ios.app',
      binaryPath:
        'ios/build/Build/Products/Release-iphonesimulator/MetaMask-QA.app',
      build: `METAMASK_BUILD_TYPE='${process.env.METAMASK_BUILD_TYPE || 'main'}' METAMASK_ENVIRONMENT='qa' yarn build:ios:qa`,
    },
    'ios.flask': {
      type: 'ios.app',
      binaryPath:
        process.env.PREBUILT_IOS_FLASK_APP_PATH || 'ios/build/Build/Products/Debug-iphonesimulator/MetaMask-Flask.app',
      build: 'yarn start:ios:e2e:flask',
    },
    'android.debug': {
      type: 'android.apk',
      binaryPath: process.env.PREBUILT_ANDROID_APK_PATH || 'android/app/build/outputs/apk/prod/debug/app-prod-debug.apk',
      testBinaryPath: process.env.PREBUILT_ANDROID_TEST_APK_PATH,
      build: 'yarn start:android:e2e',
    },
    'android.qa': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/qa/release/app-qa-release.apk',
      build: `METAMASK_BUILD_TYPE='${process.env.METAMASK_BUILD_TYPE || 'main'}' METAMASK_ENVIRONMENT='qa' yarn build:android:qa`,
    }
  },
};
