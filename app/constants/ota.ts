/**
 * OTA (Over-The-Air) Update Version Tracking
 *
 * Re-exports from the root ota.config.js file (single source of truth).
 * To update versions, edit ota.config.js at the project root.
 */

import otaConfig from '../../ota.config.js';

/**
 * Current OTA update version
 * Increment with each OTA update: v0 -> v1 -> v2 -> v3 etc.
 * Reset to v0 when releasing a new native build
 */
export const OTA_VERSION = 'v0';
export const RUNTIME_VERSION = otaConfig.RUNTIME_VERSION;
export const PROJECT_ID = otaConfig.PROJECT_ID;
export const UPDATE_URL = otaConfig.UPDATE_URL;

/**
 * Gets the full version string including OTA version
 * @param appVersion - The app version from package.json/device info
 * @returns Full version string (e.g., "7.58.0 OTA Version: v3")
 */
export const getFullVersion = (appVersion: string): string =>
  process.env.METAMASK_ENVIRONMENT !== 'production'
    ? `${appVersion} OTA: ${OTA_VERSION}`
    : `${appVersion}`;
