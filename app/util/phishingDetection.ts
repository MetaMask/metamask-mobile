import {
  PhishingDetectorResult,
  PhishingDetectorResultType,
  PhishingController as PhishingControllerClass,
} from '@metamask/phishing-controller';
import Engine from '../core/Engine';
import { store } from '../store';
import { selectProductSafetyDappScanningEnabled } from '../selectors/featureFlagController';
/**
 * Checks if product safety dapp scanning is enabled
 * @returns {boolean} Whether product safety dapp scanning is enabled
 */
export const isProductSafetyDappScanningEnabled = (): boolean =>
  selectProductSafetyDappScanningEnabled(store.getState());

/**
 * Gets detailed phishing test results for an origin
 * @param {string} origin - URL origin or hostname to check
 * @returns {PhishingDetectorResult} Phishing test result object or null if protection is disabled
 */
export const getPhishingTestResult = (
  origin: string,
): PhishingDetectorResult => {
  if (isProductSafetyDappScanningEnabled()) {
    return {
      result: false,
      name: 'Product safety dapp scanning is enabled',
      type: PhishingDetectorResultType.All,
    };
  }
  const { PhishingController } = Engine.context as {
    PhishingController: PhishingControllerClass;
  };
  PhishingController.maybeUpdateState();
  return PhishingController.test(origin);
};
