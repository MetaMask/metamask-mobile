import { config } from '../../wdio.conf';

// Appium capabilities
// https://appium.io/docs/en/writing-running-appium/caps/

delete config.port;
delete config.path;
delete config.services;

config.user = process.env.BROWSERSTACK_USERNAME;
config.key = process.env.BROWSERSTACK_ACCESS_KEY;
config.capabilities = [
  {
    platformName: 'Android',
    noReset: false,
    fullReset: false,
    maxInstances: 1,
    build: "Android QA E2E Tests",
    device: "Google Pixel 3",
    os_version: "9.0",
    app: process.env.BROWSERSTACK_APP_URL,
    'browserstack.debug': true
  },
];

config.cucumberOpts.tagExpression = '@androidApp'; // pass tag to run tests specific to android

const _config = config;
// eslint-disable-next-line import/prefer-default-export
export { _config as config };
