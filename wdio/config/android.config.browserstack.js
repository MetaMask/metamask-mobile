import { config } from '../wdio.conf';

// Appium capabilities
// https://appium.io/docs/en/writing-running-appium/caps/
config.capabilities = [
  {
    platformName: 'Android',
    noReset: true,
    fullReset: false,
    maxInstances: 1,
    deviceName: 'Android 11 - Pixel 4a API 30',
    platformVersion: '11',
    app: '../android/app/build/outputs/apk/debug/app-debug.apk',
    automationName: 'uiautomator2'
  },
];

config.cucumberOpts.tagExpression = '@androidApp'; // pass tag to run tests specific to android

const _config = config;
export { _config as config };
