import { config } from '../../wdio.conf';

// Appium capabilities
// https://appium.io/docs/en/writing-running-appium/caps/
config.capabilities = [
  {
    platformName: 'Android',
    'appium:options': {
      automationName: 'uiautomator2',
      deviceName: 'Pixel 5 API 30',
      platformVersion: '13',
      app: './android/app/build/outputs/apk/qa/debug/app-qa-debug.apk',
    },
    maxInstances: 1,
  },
];

config.cucumberOpts.tagExpression = '@performance and @androidApp'; // pass tag to run tests specific to android

const _config = config;
// eslint-disable-next-line import/prefer-default-export
export { _config as config };
