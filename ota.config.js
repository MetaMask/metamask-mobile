/**
 * OTA (Over-The-Air) Update Version Configuration
 *
 * SINGLE SOURCE OF TRUTH for all OTA and runtime versions.
 *
 * Used by:
 * - app.config.js (Expo configuration)
 * - scripts/update-expo-channel.js (Build script)
 * - app/constants/ota.ts (App runtime - TypeScript re-exports)
 *
 * Workflow:
 * 1. For OTA updates (JS-only): Increment OTA_VERSION only
 * 2. For native releases: Bump version in package.json and reset OTA_VERSION to v0
 */

/* eslint-disable import/no-commonjs */
const packageJson = require('./package.json');

/**
 * Current OTA update version
 * Increment with each OTA update: v0 -> v1 -> v2 -> v3 etc.
 * Reset to v0 when releasing a new native build
 */
const OTA_VERSION = 'v0';

/**
 * Runtime version for native compatibility
 * Automatically derived from package.json version
 * Only changes when you bump the version in package.json (native releases)
 */
const RUNTIME_VERSION = packageJson.version;

/**
 * Expo Project ID
 * The unique identifier for the Expo project
 * Loaded from environment variables
 */
const PROJECT_ID = process.env.EXPO_PROJECT_ID || '';

/**
 * Expo Updates URL
 * The URL endpoint for fetching OTA updates
 */
const UPDATE_URL = `https://u.expo.dev/${PROJECT_ID}`;

module.exports = {
  OTA_VERSION,
  RUNTIME_VERSION,
  PROJECT_ID,
  UPDATE_URL,
};
