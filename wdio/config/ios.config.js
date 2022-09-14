/* eslint-disable import/no-commonjs */
const { config } = require('../wdio.conf');

// Appium capabilities
config.capabilities = [
  {
    platformName: 'iOS',
    noReset: true,
    fullReset: false,
    maxInstances: 1,
    automationName: 'XCUITest',
    deviceName: 'iPhone 11 Pro',
    platformVersion: '15.0',
    app: 'io.metamask.MetaMask', //use - path.resolve(`./apps/${IosInfo.appName()}`) if passing a custom app
  },
];

config.cucumberOpts.tagExpression = '@iosApp'; // pass tag to run tests specific to ios

exports.config = config;
