/**
 * OTA (Over-The-Air) Update Configuration
 *
 * Provides runtime version and project metadata consumed by Expo tooling.
 *
 * Used by:
 * - app.config.js (Expo configuration)
 * - scripts/update-expo-channel.js (Build script)
 * - app/constants/ota.ts (App runtime - TypeScript re-exports)
 *
 * Workflow:
 * 1. For OTA updates (JS-only): Increment OTA_VERSION in app/constants/ota.ts
 * 2. For native releases: Bump version in package.json
 */

/* eslint-disable import/no-commonjs */
const packageJson = require('./package.json');

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
  RUNTIME_VERSION,
  PROJECT_ID,
  UPDATE_URL,
};
