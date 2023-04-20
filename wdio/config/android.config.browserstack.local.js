import { removeSync } from 'fs-extra';
import generateTestReports from '../../wdio/utils/generateTestReports';
import { config } from '../../wdio.conf';
const browserstack = require('browserstack-local');

// Appium capabilities
// https://appium.io/docs/en/writing-running-appium/caps/

config.user = 'yande_9ZLNVQ';
config.key = '4qP7M92A7bykoPyp87QH';
config.capabilities = [
  {
    platformName: 'Android',
    noReset: false,
    fullReset: false,
    maxInstances: 1,
    build: 'Android QA E2E Tests',
    device: 'Google Pixel 3a',
    os_version: '9.0',
    app: 'bs://5dde3d6c2b4d32a9d3713aa19849bad3eaed7acc', // TODO: Add package ID when upload to BrowserStack
    'browserstack.debug': true,
    'browserstack.local': true,
  },
];

config.connectionRetryCount = 3;
config.cucumberOpts.tagExpression = '@androidApp'; // pass tag to run tests specific to android
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
