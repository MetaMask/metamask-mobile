import otaConfig from '../../ota.config.js';

/**
 * Current OTA update version
 * Increment with each OTA update: v0 -> v1 -> v2 -> v3 etc.
 * Reset to v0 when releasing a new native build
 * We keep this OTA_VERSION here to because changes in ota.config.js will affect the fingerprint and break the workflow in Github Actions
 */
export const OTA_VERSION: string = 'v0';
export const RUNTIME_VERSION = otaConfig.RUNTIME_VERSION;
export const PROJECT_ID = otaConfig.PROJECT_ID;
export const UPDATE_URL = otaConfig.UPDATE_URL;

/**
 * Gets the full version string including OTA version
 * @param appVersion - The app version from package.json/device info
 * @returns Full version string (e.g., "7.58.0 OTA Version: v3")
 */
export const getFullVersion = (appVersion: string): string =>
  process.env.METAMASK_ENVIRONMENT !== 'production' && OTA_VERSION !== 'v0'
    ? `${appVersion} OTA: ${OTA_VERSION}`
    : `${appVersion}`;
