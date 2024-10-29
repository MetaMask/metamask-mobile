import { removeSync } from 'fs-extra';
import generateTestReports from '../utils/generateTestReports';
import { config } from '../../wdio.conf';

const browserstack = require('browserstack-local');

// Appium capabilities
// https://appium.io/docs/en/writing-running-appium/caps/

config.user = process.env.BROWSERSTACK_USERNAME;
config.key = process.env.BROWSERSTACK_ACCESS_KEY;

const defaultCapabilities = [
  {
    platformName: 'Android',
    noReset: false,
    fullReset: false,
    maxInstances: 1,
    build: 'iOS App Launch Times Tests',
    device: process.env.BROWSERSTACK_DEVICE || 'iPhone 13 Pro',
    os_version: process.env.BROWSERSTACK_OS_VERSION || '16',
    app: process.env.BROWSERSTACK_APP_URL,
    'browserstack.debug': true,
    'browserstack.local': true,
    settings: {
      snapshotMaxDepth: 100,
    },
  }
];

// Define capabilities for app upgrade tests
const upgradeCapabilities = [
  {
    platformName: 'Android',
    noReset: false,
    fullReset: false,
    maxInstances: 1,
    build: 'iOS App Upgrade Tests',
    device: process.env.BROWSERSTACK_DEVICE || 'iPhone 12',
    os_version: process.env.BROWSERSTACK_OS_VERSION || '15',
    app: process.env.PRODUCTION_APP_URL || process.env.BROWSERSTACK_APP_URL,
    'browserstack.debug': true,
    'browserstack.local': true,
    'browserstack.midSessionInstallApps' : [process.env.BROWSERSTACK_APP_URL],
    settings: {
      snapshotMaxDepth: 100,
    },
  },
];

// Determine test type based on command-line arguments
const isAppUpgrade = process.argv.includes('--upgrade') || false;
const isPerformance = process.argv.includes('--performance') || false;

// Consolidating the conditional logic for capabilities and tag expression
const { selectedCapabilities, defaultTagExpression } = (() => {
  if (isAppUpgrade) {
      return {
          selectedCapabilities: upgradeCapabilities,
          defaultTagExpression: '@upgrade and @iosApp',
      };
  } else if (isPerformance) {
      return {
          selectedCapabilities: defaultCapabilities,
          defaultTagExpression: '@performance and @iosApp',
      };
  } else {
      return {
          selectedCapabilities: defaultCapabilities,
          defaultTagExpression: '@smoke and @iosApp',
      };
  }
})();

// Apply the selected configuration
config.cucumberOpts.tagExpression = selectedCapabilities; // pass tag to run tests specific to android
config.cucumberOpts.tagExpression = process.env.BROWSERSTACK_TAG_EXPRESSION || defaultTagExpression;

config.waitforTimeout = 10000; // do we need these here as well?
config.connectionRetryTimeout = 90000; // do we need these here as well?
config.connectionRetryCount = 3;


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
 
export { _config as config };
