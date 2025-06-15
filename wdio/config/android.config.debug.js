import { config } from '../../wdio.conf';

// Appium capabilities
// https://appium.io/docs/en/writing-running-appium/caps/
config.capabilities = [
  {
    'appium:platformName': 'Android',
    'appium:noReset': false,
    'appium:fullReset': false,
    maxInstances: 1,
    'appium:deviceName': 'Pixel 6',
    'appium:platformVersion': '14',
    'appium:app':'./android/app/build/outputs/apk/qa/debug/app-qa-debug.apk',
    'appium:automationName': 'uiautomator2',
  },
];
config.cucumberOpts.tagExpression = '@performance and @androidApp'; // pass tag to run tests specific to android

const _config = config;
 
export { _config as config };
