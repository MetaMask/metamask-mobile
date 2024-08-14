import { removeSync } from 'fs-extra';
import generateTestReports from '../../wdio/utils/generateTestReports';
import { config } from '../../wdio.conf';

const browserstack = require('browserstack-local');

// Appium capabilities
// https://appium.io/docs/en/writing-running-appium/caps/

config.user = process.env.BROWSERSTACK_USERNAME;
config.key = process.env.BROWSERSTACK_ACCESS_KEY;

// Define capabilities for regular tests
const defaultCapabilities = [
  {
    platformName: 'Android',
    noReset: false,
    fullReset: false,
    maxInstances: 1,
    build: 'Android App Launch Times Tests',
    device: process.env.BROWSERSTACK_DEVICE || 'Google Pixel 6',
    os_version: process.env.BROWSERSTACK_OS_VERSION || '12.0',
    app: process.env.BROWSERSTACK_APP_URL,
    'browserstack.debug': true,
    'browserstack.local': true,
  }
];

// Define capabilities for app upgrade tests
const upgradeCapabilities = [
  {
    platformName: 'Android',
    noReset: false,
    fullReset: false,
    maxInstances: 1,
    build: 'Android App Upgrade Tests',
    device: process.env.BROWSERSTACK_DEVICE || 'Google Pixel 6',
    os_version: process.env.BROWSERSTACK_OS_VERSION || '12.0',
    app: process.env.PRODUCTION_APP_URL || process.env.BROWSERSTACK_APP_URL,
    'browserstack.debug': true,
    'browserstack.local': true,
    'browserstack.midSessionInstallApps' : [process.env.BROWSERSTACK_APP_URL],
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
            defaultTagExpression: '@upgrade and @androidApp',
        };
    } else if (isPerformance) {
        return {
            selectedCapabilities: defaultCapabilities,
            defaultTagExpression: '@performance and @androidApp',
        };
    } else {
        return {
            selectedCapabilities: defaultCapabilities,
            defaultTagExpression: '@smoke and @androidApp',
        };
    }
})();

// Apply the selected configuration
config.capabilities = selectedCapabilities;
config.cucumberOpts.tagExpression = process.env.BROWSERSTACK_TAG_EXPRESSION || defaultTagExpression;

config.waitforTimeout = 10000;
config.connectionRetryTimeout = 90000;
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

module.exports = { config };
