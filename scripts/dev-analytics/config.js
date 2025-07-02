const fs = require('fs');
const path = require('path');
const os = require('os');

const CONFIG_DIR = path.join(os.homedir(), '.metamask-mobile-dev-analytics');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

const DEFAULT_CONFIG = {
  optedIn: false,
  userId: null,
  zapierWebhookUrl: null,
  createdAt: new Date().toISOString(),
  lastUpdated: new Date().toISOString()
};

/**
 * Ensures the config directory exists
 */
function ensureConfigDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

/**
 * Loads the configuration from disk, creating default if it doesn't exist
 */
function loadConfig() {
  ensureConfigDir();
  
  if (!fs.existsSync(CONFIG_FILE)) {
    return DEFAULT_CONFIG;
  }
  
  try {
    const configData = fs.readFileSync(CONFIG_FILE, 'utf8');
    return { ...DEFAULT_CONFIG, ...JSON.parse(configData) };
  } catch (error) {
    console.warn('Failed to load dev analytics config, using defaults:', error.message);
    return DEFAULT_CONFIG;
  }
}

/**
 * Saves the configuration to disk
 */
function saveConfig(config) {
  ensureConfigDir();
  
  const updatedConfig = {
    ...config,
    lastUpdated: new Date().toISOString()
  };
  
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(updatedConfig, null, 2));
    return true;
  } catch (error) {
    console.error('Failed to save dev analytics config:', error.message);
    return false;
  }
}

/**
 * Generates a unique user ID
 */
function generateUserId() {
  const crypto = require('crypto');
  return crypto.randomUUID();
}

/**
 * Checks if analytics are enabled
 */
function isAnalyticsEnabled() {
  const config = loadConfig();
  return config.optedIn && config.zapierWebhookUrl;
}

/**
 * Opt in to analytics with Zapier webhook URL
 */
function optIn(zapierWebhookUrl) {
  if (!zapierWebhookUrl) {
    throw new Error('Zapier webhook URL is required to opt in to analytics');
  }
  
  const config = loadConfig();
  const updatedConfig = {
    ...config,
    optedIn: true,
    zapierWebhookUrl,
    userId: config.userId || generateUserId()
  };
  
  return saveConfig(updatedConfig);
}

/**
 * Opt out of analytics
 */
function optOut() {
  const config = loadConfig();
  const updatedConfig = {
    ...config,
    optedIn: false
  };
  
  return saveConfig(updatedConfig);
}

/**
 * Gets the current configuration
 */
function getConfig() {
  return loadConfig();
}

module.exports = {
  loadConfig,
  saveConfig,
  generateUserId,
  isAnalyticsEnabled,
  optIn,
  optOut,
  getConfig,
  CONFIG_FILE
}; 