import { PhishingController as PhishingControllerClass, PhishingDetectorResult } from '@metamask/phishing-controller';
import Engine from '../core/Engine';
import { store } from '../store';
import { selectBasicFunctionalityEnabled } from '../selectors/settings';

/**
 * Checks if phishing protection is enabled based on the basic functionality toggle
 * @returns {boolean} Whether phishing protection is enabled
 */
export const isPhishingDetectionEnabled = (): boolean => selectBasicFunctionalityEnabled(store.getState());

/**
 * Gets detailed phishing test results for an origin
 * @param {string} origin - URL origin or hostname to check
 * @returns {Object} Phishing test result object or null if protection is disabled
 */
export const getPhishingTestResult = (origin: string): PhishingDetectorResult | null => {
  if (!isPhishingDetectionEnabled()) {
    return null;
  }

  const { PhishingController } = Engine.context as {
    PhishingController: PhishingControllerClass;
  };
  PhishingController.maybeUpdateState();
  return PhishingController.test(origin);
};