import { config } from '../../wdio.conf';

// Appium capabilities
// https://appium.io/docs/en/writing-running-appium/caps/
config.capabilities = [
  {
    platformName: 'Android',
    noReset: false,
    fullReset: false,
    maxInstances: 1,
    deviceName: 'Android 11 - Pixel 4a API 3',
    platformVersion: '11',
    app: './android/app/build/outputs/apk/qa/debug/app-qa-debug.apk',
    automationName: 'uiautomator2',
  },
];

config.cucumberOpts.tagExpression = '@androidApp'; // pass tag to run tests specific to android

const _config = config;
// eslint-disable-next-line import/prefer-default-export
export { _config as config };
