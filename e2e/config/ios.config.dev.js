import { config } from '../wdio.conf';

// Appium capabilities
// https://appium.io/docs/en/writing-running-appium/caps/
config.capabilities = [
  {
    platformName: 'iOS',
    noReset: true,
    fullReset: false,
    maxInstances: 1,
    automationName: 'XCUITest',
    deviceName: 'iPhone 11 Pro',
    platformVersion: '15.5',
    app: '../ios/build/Build/Products/Debug-iphonesimulator/MetaMask-QA.app',
  },
];

config.cucumberOpts.tagExpression = '@iosApp'; // pass tag to run tests specific to ios

const _config = config;
export { _config as config };
