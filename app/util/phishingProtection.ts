import { PhishingController as PhishingControllerClass, PhishingDetectorResult } from '@metamask/phishing-controller';
import Engine from '../core/Engine';
import { store } from '../store';
import { selectBasicFunctionalityEnabled } from '../selectors/settings';

/**
 * Checks if phishing protection is enabled based on the basic functionality toggle
 * @returns {boolean} Whether phishing protection is enabled
 */
export const isPhishingProtectionEnabled = (): boolean => selectBasicFunctionalityEnabled(store.getState());

/**
 * Checks if a URL origin is safe
 * @param {string} origin - URL origin or hostname to check
 * @param {string[]} whitelist - Optional whitelist of allowed origins
 * @returns {boolean} Whether the origin is considered safe
 */
export const isOriginSafe = (origin: string, whitelist?: string[]): boolean => {
  if (!isPhishingProtectionEnabled()) {
    return true;
  }

  const { PhishingController } = Engine.context as {
    PhishingController: PhishingControllerClass;
  };

  // Update phishing configuration if needed
  PhishingController.maybeUpdateState();
  const phishingResult = PhishingController.test(origin);
  // Check if origin is in whitelist or not flagged by phishing test
  return whitelist?.includes(origin) || !phishingResult.result;
};

/**
 * Updates the phishing detection database if needed
 * Should be called only when phishing protection is enabled
 */
export const updatePhishingLists = (): void => {
  if (!isPhishingProtectionEnabled()) {
    return;
  }

  const { PhishingController } = Engine.context as {
    PhishingController: PhishingControllerClass;
  };
  PhishingController.maybeUpdateState();
};

/**
 * Gets detailed phishing test results for an origin
 * @param {string} origin - URL origin or hostname to check
 * @returns {Object} Phishing test result object or null if protection is disabled
 */
export const getPhishingTestResult = (origin: string): PhishingDetectorResult | null => {
  if (!isPhishingProtectionEnabled()) {
    return null;
  }

  const { PhishingController } = Engine.context as {
    PhishingController: PhishingControllerClass;
  };
  PhishingController.maybeUpdateState();
  return PhishingController.test(origin);
};