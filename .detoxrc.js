/** @type {Detox.DetoxConfig} */
module.exports = {
  testRunner: {
    args: {
      $0: 'jest',
      config: 'e2e/jest.e2e.config.js',
    },
    jest: {
      setupTimeout: 120000,
    },
  },

  configurations: {
    'ios.sim.debug': {
      device: 'ios.simulator',
      app: 'ios.debug',
    },
    'ios.sim.release': {
      device: 'ios.simulator',
      app: 'ios.release',
    },
    'android.emu.debug': {
      device: 'android.emulator',
      app: 'android.debug',
    },
    'android.emu.release': {
      device: 'android.emulator',
      app: 'android.release',
    },
    'android.emu.release.qa': {
      device: 'android.emulator',
      app: 'android.qa',
    },
  },
  devices: {
    'ios.simulator': {
      type: 'ios.simulator',
      device: {
        type: 'iPhone 12 Pro',
      },
    },
    'android.emulator': {
      type: 'android.emulator',
      device: {
        avdName: 'Pixel_5_API_30',
      },
    },
  },
  apps: {
    'ios.debug': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Debug-iphonesimulator/MetaMask.app',
      build: 'yarn start:ios:e2e',
    },
    'ios.release': {
      type: 'ios.app',
      binaryPath:
        'ios/build/Build/Products/Release-iphonesimulator/MetaMask.app',
      build: "METAMASK_ENVIRONMENT='production' yarn build:ios:release:e2e",
    },
    'android.debug': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/prod/debug/app-prod-debug.apk',
      build: 'yarn start:android:e2e',
    },
    'android.release': {
      type: 'android.apk',
      binaryPath:
        'android/app/build/outputs/apk/prod/release/app-prod-release.apk',
      build: "METAMASK_ENVIRONMENT='production' yarn build:android:release:e2e",
    },
    'android.qa': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/qa/release/app-qa-release.apk',
      build: "METAMASK_ENVIRONMENT='qa' yarn build:android:qa:e2e",
    },
  },
};
