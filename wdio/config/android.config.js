const { config } = require('../wdio.conf');

// Appium capabilities
config.capabilities = [
  {
    platformName: 'Android',
    noReset: true,
    fullReset: false,
    maxInstances: 1,
    deviceName: 'Pixel 3 XL - 12',
    platformVersion: '12',
    app: '../android/app/build/outputs/apk/debug/app-debug.apk',
    appPackage: 'io.metamask',
    appActivity: '.MainActivity',
    automationName: 'UiAutomator2',
  },
];

//config.cucumberOpts.tagExpression = '@androidApp'; // pass tag to run tests specific to android

exports.config = config;
