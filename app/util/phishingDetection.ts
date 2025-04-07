import { PhishingController as PhishingControllerClass, PhishingDetectorResult } from '@metamask/phishing-controller';
import Engine from '../core/Engine';
/**
 * Gets detailed phishing test results for an origin
 * @param {string} origin - URL origin or hostname to check
 * @returns {Object} Phishing test result object or null if protection is disabled
 */
export const getPhishingTestResult = (origin: string): PhishingDetectorResult | null => {
  const { PhishingController } = Engine.context as {
    PhishingController: PhishingControllerClass;
  };
  PhishingController.maybeUpdateState();
  return PhishingController.test(origin);
};