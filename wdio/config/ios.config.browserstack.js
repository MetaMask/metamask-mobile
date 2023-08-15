import { config } from '../../wdio.conf';
import { removeSync } from 'fs-extra';
import generateTestReports from '../utils/generateTestReports';

const browserstack = require('browserstack-local');

// Appium capabilities
// https://appium.io/docs/en/writing-running-appium/caps/
config.capabilities = [
  {
    platformName: 'iOS',
    maxInstances: 1,
    'appium:options': {
      deviceName: process.env.BROWSERSTACK_DEVICE || 'iPhone 12 Pro',
      platformVersion: process.env.BROWSERSTACK_OS_VERSION || '15.5',
      app: process.env.BROWSERSTACK_APP_URL,
      settings: {
        snapshotMaxDepth: 100,
      },
    },
    'bstack:options': {
      appiumVersion: '2.0.1',
      buildName: 'iOS QA E2E Smoke Tests',
      debug: true,
      local: 'true',
      disableAnimations: true,
    },
  },
];

config.waitforTimeout = 10000;
config.connectionRetryTimeout = 90000;
config.connectionRetryCount = 3;
config.cucumberOpts.tagExpression =
  process.env.BROWSERSTACK_TAG_EXPRESSION || '@performance and @iosApp'; // pass tag to run tests specific to android

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

module.exports = { config };
