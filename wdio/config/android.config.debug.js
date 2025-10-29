import { config } from '../../wdio.conf';

// Appium capabilities
// https://appium.io/docs/en/writing-running-appium/caps/
config.capabilities = [
  {
    platformName: 'Android',
    noReset: false,
    fullReset: false,
    maxInstances: 1,
    deviceName: 'Pixel 5 API 32',
    platformVersion: '13',
    app: './android/app/build/outputs/apk/qa/debug/app-qa-debug.apk',
    automationName: 'uiautomator2',
  },
];

// Note: Cucumber removed - configure test filtering as needed for your test framework
// config.cucumberOpts.tagExpression = '@performance and @androidApp';

const _config = config;
 
export { _config as config };
