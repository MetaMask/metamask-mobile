import { PhishingDetectorResult } from '@metamask/phishing-controller';
import Engine from '../core/Engine';
import { store } from '../store';
import { selectBasicFunctionalityEnabled } from '../selectors/settings';
import { selectProductSafetyDappScanningEnabled } from '../selectors/featureFlagController';

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
 * Handles dapp scanning
 */
const handleDappScanning = (): void => {
  // TODO: Implement dapp scanning
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

  if (isProductSafetyDappScanningEnabled()) {
    handleDappScanning();
    return null;
  }
  

  const PhishingController = Engine.context.PhishingController;
  PhishingController.maybeUpdateState();
  return PhishingController.test(origin);
};