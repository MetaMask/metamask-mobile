import { config } from '../../wdio.conf';

// Appium capabilities
// https://appium.io/docs/en/writing-running-appium/caps/

config.user = process.env.BROWSERSTACK_USERNAME;
config.key = process.env.BROWSERSTACK_ACCESS_KEY;

config.capabilities = [
  {
    platformName: 'Android',
    noReset: false,
    fullReset: false,
    maxInstances: 1,
    build: 'Android QA E2E Tests',
    device: process.env.BROWSERSTACK_DEVICE || 'Google Pixel 6',
    os_version: process.env.BROWSERSTACK_OS_VERSION || '12.0',
    app: process.env.BROWSERSTACK_APP_URL,
    'browserstack.debug': true,
  },
];

config.waitforTimeout = 10000;
config.connectionRetryTimeout = 90000;
config.connectionRetryCount = 3;
config.cucumberOpts.tagExpression =
  process.env.BROWSERSTACK_TAG_EXPRESSION || '@androidApp'; // pass tag to run tests specific to android

delete config.port;
delete config.path;
delete config.services;

const _config = config;
// eslint-disable-next-line import/prefer-default-export
export { _config as config };
