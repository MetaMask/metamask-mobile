import { config } from '../../wdio.conf';

// Appium capabilities
// https://appium.io/docs/en/writing-running-appium/caps/
config.capabilities = [
  {
    platformName: 'Android',
    'appium:noReset': false,
    'appium:fullReset': false,
    'appium:maxInstances': 1,
    'appium:deviceName':'Samsung Galaxy S23 Ultra',
    'appium:os_version':'13.0',
    'appium:app': './android/app/build/outputs/apk/qa/debug/app-qa-debug.apk',
    'appium:automationName': 'uiautomator2',
  },

];

config.cucumberOpts.tagExpression = '@performance and @androidApp'; // pass tag to run tests specific to android

const _config = config;
 
export { _config as config };
