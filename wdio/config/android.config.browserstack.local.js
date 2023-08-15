import { removeSync } from 'fs-extra';
import generateTestReports from '../../wdio/utils/generateTestReports';
import { config } from '../../wdio.conf';

const browserstack = require('browserstack-local');

// Appium capabilities
// https://appium.io/docs/en/writing-running-appium/caps/

config.user = process.env.BROWSERSTACK_USERNAME;
config.key = process.env.BROWSERSTACK_ACCESS_KEY;

config.capabilities = [
  {
    platformName: 'Android',
    'appium:options': {
      deviceName: 'Google Pixel 3a',
      platformVersion: '9.0',
      app: process.env.BROWSERSTACK_APP_URL, // TODO: Add package ID when upload to BrowserStack
    },
    'bstack:options': {
      appiumVersion: '2.0.1',
      buildName: 'Android QA E2E Tests',
      debug: true,
      local: 'true',
      disableAnimations: true,
    },
    maxInstances: 1,
  },
];

config.connectionRetryCount = 3;
config.cucumberOpts.tagExpression = '@performance and @androidApp';
config.onPrepare = function (config, capabilities) {
  removeSync('./wdio/reports');
  console.log('Connecting local');
  return new Promise((resolve, reject) => {
    exports.bs_local = new browserstack.Local();
    exports.bs_local.start({ key: config.key }, (error) => {
      if (error) return reject(error);
      console.log('Connected. Now testing...');

      resolve();
    });
  });
};
config.onComplete = function (exitCode, config, capabilities, results) {
  generateTestReports();
  console.log('Closing local tunnel');
  return new Promise((resolve, reject) => {
    exports.bs_local.stop((error) => {
      if (error) return reject(error);
      console.log('Stopped BrowserStackLocal');

      resolve();
    });
  });
};

delete config.port;
delete config.path;
delete config.services;

const _config = config;
// eslint-disable-next-line import/prefer-default-export
export { _config as config };
