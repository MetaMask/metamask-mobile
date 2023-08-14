import { config } from '../../wdio.conf';

// Appium capabilities
// https://appium.io/docs/en/writing-running-appium/caps/
config.capabilities = [
  {
    platformName: 'Android',
    'appium:options': {
      automationName: 'uiautomator2',
      platformVersion: '11',
      app: './android/app/build/outputs/apk/qa/debug/app-qa-debug.apk',
      deviceName: 'Pixel_5_API_30',
      noReset: false,
    },
    maxInstances: 1,
  },
];

config.cucumberOpts.tagExpression = '@androidApp'; // pass tag to run tests specific to android

const _config = config;
// eslint-disable-next-line import/prefer-default-export
export { _config as config };
