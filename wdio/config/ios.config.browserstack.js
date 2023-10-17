import { config } from '../../wdio.conf';

// Appium capabilities
// https://appium.io/docs/en/writing-running-appium/caps/
config.capabilities = [
  {
    platformName: 'iOS',
    noReset: true,
    fullReset: false,
    maxInstances: 1,
    automationName: 'XCUITest',
    deviceName: 'iPhone 12 Pro',
    platformVersion: '15.5',
    app: './ios/build/Build/Products/Release-iphonesimulator/MetaMask-QA.app',
    settings: {
      snapshotMaxDepth: 100,
    },
  },
];

config.cucumberOpts.tagExpression = '@iosApp'; // pass tag to run tests specific to ios

const _config = config;
// eslint-disable-next-line import/prefer-default-export
export { _config as config };
