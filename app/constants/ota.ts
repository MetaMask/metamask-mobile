/**
 * OTA (Over-The-Air) Update Version Tracking
 *
 * Re-exports from the root ota.config.js file (single source of truth).
 * To update versions, edit ota.config.js at the project root.
 */

import otaConfig from '../../ota.config.js';

export const OTA_VERSION = 'v1';
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
