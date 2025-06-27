import { removeSync } from 'fs-extra';
import generateTestReports from '../../wdio/utils/generateTestReports';
import BrowserStackAPI from '../../wdio/utils/browserstackApi';
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
    'appium:noReset': false,
    'appium:fullReset': false,
    'appium:maxInstances': 1,
    'appium:build': 'Android App Launch Times Tests',
    'appium:deviceName': process.env.BROWSERSTACK_DEVICE || 'Samsung Galaxy S23 Ultra',
    'appium:os_version': process.env.BROWSERSTACK_OS_VERSION || '13.0',
    'appium:app': process.env.BROWSERSTACK_ANDROID_APP_URL,
    'bstack:options' : {
        "appProfiling" : "true",
        "local": "true",  
    }
  }
];

// Define capabilities for app upgrade tests
const upgradeCapabilities = [
  {
    platformName: 'Android',
    'appium:noReset': false,
    'appium:fullReset': false,
    'appium:maxInstances': 1,
    'appium:build': 'Android App Upgrade Tests',
    'appium:deviceName': process.env.BROWSERSTACK_DEVICE || 'Google Pixel 6',
    'appium:os_version': process.env.BROWSERSTACK_OS_VERSION || '12.0',
    'appium:app': process.env.PRODUCTION_APP_URL,
    'bstack:options' : {
      "appProfiling" : "true",
      "local": "true",
      "debug": true,
      "midSessionInstallApps" : [process.env.BROWSERSTACK_ANDROID_APP_URL]
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
            defaultTagExpression: '@upgrade and @androidApp',
        };
    } else if (isPerformance) {
        return {
            selectedCapabilities: defaultCapabilities,
            defaultTagExpression: '@temp and @androidApp',
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

// Add BrowserStack service for local testing
config.services = [
  [
    'browserstack',
    {
      accessibility: false,
      buildIdentifier: 'metamask-mobile-tests',
      browserstackLocal: true,
    }
  ]
];

config.onPrepare = function (config, capabilities) {
  removeSync('./wdio/reports');
  console.log('=== onPrepare called ===');
  console.log('Config:', JSON.stringify(config, null, 2));
  console.log('Capabilities:', JSON.stringify(capabilities, null, 2));
};

// Store session information for later use
let sessionInfo = null;

config.beforeSession = function (config, capabilities, specs, cid) {
  // This will be called before each session starts
  console.log('=== beforeSession called ===');
  console.log('Session starting with capabilities:', JSON.stringify(capabilities, null, 2));
  console.log('Specs:', specs);
  console.log('CID:', cid);
};

config.before = async function (capabilities, specs, browser) {
  // This will be called before each test starts, when the driver is available
  console.log('=== before called ===');
  console.log('Browser object:', browser);
  
  try {
    // Get the actual BrowserStack session ID from the driver
    const sessionCapabilities = await browser.getSession();
    console.log('Session capabilities in before:', JSON.stringify(sessionCapabilities, null, 2));
    
    // The session ID from capabilities is usually the device UDID, not the BrowserStack session ID
    // We'll need to extract the actual BrowserStack session ID from the test output later
    const deviceUDID = sessionCapabilities.sessionId;
    console.log('Device UDID from capabilities:', deviceUDID);
    
    sessionInfo = {
      sessionId: null, // Will be set later from test output
      deviceUDID: deviceUDID,
      buildId: sessionCapabilities['bstack:options']?.buildIdentifier || 
               sessionCapabilities.build ||
               sessionCapabilities['appium:build'],
      capabilities: sessionCapabilities
    };
    
    // Store globally so it can be accessed from Cucumber steps
    global.sessionInfo = sessionInfo;
    globalThis.sessionInfo = sessionInfo;
    
    console.log('Session info stored in before:', JSON.stringify(sessionInfo, null, 2));
    console.log('Session info stored globally:', JSON.stringify(global.sessionInfo, null, 2));
    
    // Try to capture the actual BrowserStack session ID
    try {
      const BrowserStackAPI = require('../utils/browserstackApi');
      const api = new BrowserStackAPI();
      
      // Look for BrowserStack session ID in the capabilities or environment
      const browserstackSessionId = sessionCapabilities['bstack:options']?.sessionId ||
                                   process.env.BROWSERSTACK_SESSION_ID ||
                                   deviceUDID;
      
      if (browserstackSessionId) {
        api.captureCurrentSessionId(browserstackSessionId);
      }
    } catch (error) {
      console.error('Error capturing session ID:', error);
    }
  } catch (error) {
    console.error('Error capturing session info in before:', error);
    console.error('Error stack:', error.stack);
  }
};

config.afterSession = async function (config, capabilities, specs, cid) {
  // This will be called after each session ends
  console.log('=== afterSession called ===');
  console.log('Config:', JSON.stringify(config, null, 2));
  console.log('Capabilities:', JSON.stringify(capabilities, null, 2));
  console.log('Specs:', specs);
  console.log('CID:', cid);
  console.log('Session info available in afterSession:', !!sessionInfo);
  console.log('Session info in afterSession:', JSON.stringify(sessionInfo, null, 2));
};

config.onComplete = async function (exitCode, config, capabilities, results) {
  console.log('=== onComplete called ===');
  console.log('Exit code:', exitCode);
  console.log('Config:', JSON.stringify(config, null, 2));
  console.log('Capabilities:', JSON.stringify(capabilities, null, 2));
  console.log('Results:', JSON.stringify(results, null, 2));
  console.log('Session info available:', !!sessionInfo);
  
  // Generate test reports
  generateTestReports();
  
  // Collect app profiling data for the current session only
  try {
    console.log('=== Collecting app profiling data for current session ===');
    
    const BrowserStackAPI = require('../utils/browserstackApi');
    const api = new BrowserStackAPI();
    
    // Use the new method that only gets data for the current session
    const profilingData = await api.getCurrentSessionProfilingData();
    
    if (profilingData) {
      // Save the profiling data with a timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `current-session-profiling-${timestamp}.json`;
      api.saveProfilingData(profilingData, filename);
      
      console.log(`Profiling data saved for current session: ${filename}`);
    } else {
      console.log('No profiling data available for current session');
    }
    
  } catch (error) {
    console.error('Error collecting profiling data:', error);
    console.error('Error stack:', error.stack);
  }
};

delete config.port;
delete config.path;
delete config.services;

module.exports = { config };