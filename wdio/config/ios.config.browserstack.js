import { removeSync } from 'fs-extra';
import generateTestReports from '../utils/generateTestReports';
import { config } from '../../wdio.conf';

const browserstack = require('browserstack-local');

// BrowserStack credentials
config.user = process.env.BROWSERSTACK_USERNAME;
config.key = process.env.BROWSERSTACK_ACCESS_KEY;

// Define iOS capabilities for non-upgrade and upgrade tests
const defaultCapabilities = [
  {
    platformName: 'iOS',
    maxInstances: 1,
    'appium:deviceName': process.env.BROWSERSTACK_DEVICE || 'iPhone 15 Pro',
    'appium:platformVersion': process.env.BROWSERSTACK_OS_VERSION || '17.3',
    'appium:automationName': 'XCUITest',
    'appium:app': process.env.BROWSERSTACK_IOS_APP_URL,
    'appium:fullReset': true,
    'appium:settings[snapshotMaxDepth]': 62,
    'appium:settings[customSnapshotTimeout]': 50000,
    'bstack:options': {
      buildName: 'iOS App Launch Times Tests',
    },
  },
];

const upgradeCapabilities = [
  {
    platformName: 'iOS',
    maxInstances: 1,
    'appium:deviceName': process.env.BROWSERSTACK_DEVICE || 'iPhone 15 Pro',
    'appium:platformVersion': process.env.BROWSERSTACK_OS_VERSION || '17.3',
    'appium:automationName': 'XCUITest',
    'appium:app': process.env.PRODUCTION_APP_URL || process.env.BROWSERSTACK_IOS_APP_URL,
    'appium:noReset': true,
    'appium:settings[snapshotMaxDepth]': 62,
    'appium:settings[customSnapshotTimeout]': 50000,
    'bstack:options': {
      buildName: 'iOS App Upgrade E2E',
    },
  },
];

// Determine selected capabilities and tags
const isAppUpgrade = process.argv.includes('--upgrade');
const isPerformance = process.argv.includes('--performance');
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
config.capabilities = selectedCapabilities;
config.cucumberOpts.tagExpression = process.env.BROWSERSTACK_TAG_EXPRESSION || defaultTagExpression;

config.waitforTimeout = 10000;
config.connectionRetryTimeout = 90000;
config.connectionRetryCount = 3;
// BrowserStack Local setup
config.onPrepare = function () {
  removeSync('./wdio/reports');
  return new Promise((resolve, reject) => {
    exports.bs_local = new browserstack.Local();
    exports.bs_local.start({ key: config.key }, (error) => error ? reject(error) : resolve());
  });
};

config.onComplete = function () {
  generateTestReports();
  return new Promise((resolve, reject) => {
    exports.bs_local.stop((error) => error ? reject(error) : resolve());
  });
};

// Cleanup BrowserStack-specific configuration settings
delete config.port;
delete config.path;
delete config.services;

module.exports = { config };
