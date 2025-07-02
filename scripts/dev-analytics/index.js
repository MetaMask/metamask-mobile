/**
 * MetaMask Mobile Developer Analytics
 * 
 * A privacy-first analytics system for tracking developer command usage.
 * 
 * @example
 * const analytics = require('./scripts/dev-analytics');
 * 
 * // Check if analytics are enabled
 * if (analytics.isEnabled()) {
 *   // Track a custom event
 *   await analytics.trackEvent('custom_build_step', {
 *     step: 'webpack_bundle',
 *     duration: 15000,
 *     success: true
 *   });
 * }
 */

const config = require('./config');
const tracker = require('./tracker');
const cli = require('./cli');
const commandWrapper = require('./command-wrapper');
const setupTracking = require('./setup-tracking');

// Export config functions
const {
  isAnalyticsEnabled,
  optIn,
  optOut,
  getConfig,
  loadConfig,
  saveConfig,
  generateUserId
} = config;

// Export tracking functions
const {
  trackCommand,
  trackCommandCompletion,
  trackEvent,
  sendToZapier,
  getSystemInfo,
  getGitInfo,
  getProjectInfo
} = tracker;

// Export CLI functions
const {
  showHelp,
  showStatus,
  handleOptIn,
  handleOptOut,
  handleTest
} = cli;

// Export setup functions
const {
  setupTracking: setupCommandTracking,
  removeTracking: removeCommandTracking,
  wrapCommand,
  unwrapCommand,
  COMMANDS_TO_TRACK
} = setupTracking;

// Export command wrapper functions
const {
  parseArguments,
  executeCommand
} = commandWrapper;

// Main analytics object
const analytics = {
  // Configuration
  isEnabled: isAnalyticsEnabled,
  optIn,
  optOut,
  getConfig,
  loadConfig,
  saveConfig,
  generateUserId,
  
  // Tracking
  trackCommand,
  trackCommandCompletion,
  trackEvent,
  sendToZapier,
  
  // CLI operations
  showHelp,
  showStatus,
  handleOptIn,
  handleOptOut,
  handleTest,
  
  // Setup operations
  setupCommandTracking,
  removeCommandTracking,
  wrapCommand,
  unwrapCommand,
  
  // Command wrapper
  parseArguments,
  executeCommand,
  
  // Constants
  COMMANDS_TO_TRACK,
  
  // Version info
  version: '1.0.0',
  name: 'MetaMask Mobile Developer Analytics'
};

// Convenience functions
analytics.init = async function(zapierWebhookUrl) {
  if (!zapierWebhookUrl) {
    throw new Error('Zapier webhook URL is required to initialize analytics');
  }
  
  const success = optIn(zapierWebhookUrl);
  if (success) {
    await trackEvent('analytics_initialized', {
      source: 'programmatic',
      version: analytics.version
    });
    return true;
  }
  return false;
};

analytics.destroy = function() {
  return optOut();
};

// Export everything
module.exports = analytics;

// Also export individual modules for direct access
module.exports.config = config;
module.exports.tracker = tracker;
module.exports.cli = cli;
module.exports.commandWrapper = commandWrapper;
module.exports.setupTracking = setupTracking; 