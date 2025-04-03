import { PhishingController as PhishingControllerClass, PhishingDetectorResult } from '@metamask/phishing-controller';
import Engine from '../core/Engine';
import { store } from '../store';
import { selectBasicFunctionalityEnabled } from '../selectors/settings';
import { selectProductSafetyDappScanningEnabled } from '../selectors/featureFlagController';
import Logger from './Logger';

/**
 * Checks if phishing protection is enabled based on the basic functionality toggle
 * @returns {boolean} Whether phishing protection is enabled
 */
export const isPhishingDetectionEnabled = (): boolean => selectBasicFunctionalityEnabled(store.getState());

/**
 * Checks if product safety dapp scanning is enabled
 * @returns {boolean} Whether product safety dapp scanning is enabled
 */
export const isProductSafetyDappScanningEnabled = (): boolean => selectProductSafetyDappScanningEnabled(store.getState());

/**
 * Gets the phishing controller instance from Engine context
 * @returns PhishingControllerClass instance
 */
const getPhishingController = (): PhishingControllerClass => {
  const { PhishingController } = Engine.context as {
    PhishingController: PhishingControllerClass;
  };
  return PhishingController;
};

/**
 * Handles the case when product safety dapp scanning is disabled
 * Logs the real-time dapp scanning message
 */
const handleDappScanning = (): void => {
  Logger.log('Real time dapp scanning enabled');
};

/**
 * Checks if a URL origin is safe
 * @param {string} origin - URL origin or hostname to check
 * @param {string[]} whitelist - Optional whitelist of allowed origins
 * @returns {boolean} Whether the origin is considered safe
 */
export const isOriginSafe = (origin: string, whitelist?: string[]): boolean => {
  // If basic functionality is disabled, all origins are considered safe
  if (!isPhishingDetectionEnabled()) {
    return true;
  }

  // Check whitelist first
  if (whitelist?.includes(origin)) {
    return true;
  }

  // Check if product safety dapp scanning is enabled
  if (!isProductSafetyDappScanningEnabled()) {
    handleDappScanning();
    return true;
  }

  // Feature flag is on, perform the actual phishing check
  const PhishingController = getPhishingController();
  // Update phishing configuration if needed
  PhishingController.maybeUpdateState();
  const phishingResult = PhishingController.test(origin);
  return !phishingResult.result;
};

/**
 * Updates the phishing detection database if needed
 * Should be called only when phishing protection is enabled
 */
export const updatePhishingLists = (): void => {
  // Skip update if EPD or basic functionality are disabled
  if (!isPhishingDetectionEnabled() || isProductSafetyDappScanningEnabled()) {
    return;
  }

  const PhishingController = getPhishingController();
  PhishingController.maybeUpdateState();
};

/**
 * Gets detailed phishing test results for an origin
 * @param {string} origin - URL origin or hostname to check
 * @returns {PhishingDetectorResult | null} Phishing test result object or null if protection is disabled
 */
export const getPhishingTestResult = (origin: string): PhishingDetectorResult | null => {
  if (!isPhishingDetectionEnabled()) {
    return null;
  }

  if (!isProductSafetyDappScanningEnabled()) {
    handleDappScanning();
    return null;
  }

  // Feature flag is on, perform the actual test
  const PhishingController = getPhishingController();
  PhishingController.maybeUpdateState();
  return PhishingController.test(origin);
};