import {
  PhishingDetectorResult,
  PhishingDetectorResultType,
  PhishingController as PhishingControllerClass,
  RecommendedAction,
} from '@metamask/phishing-controller';
import Engine from '../core/Engine';
import { store } from '../store';
import { selectProductSafetyDappScanningEnabled } from '../selectors/featureFlagController/productSafetyDappScanning';

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
      type: 'DAPP_SCANNING' as PhishingDetectorResultType,
    };
  }
  const { PhishingController } = Engine.context as {
    PhishingController: PhishingControllerClass;
  };
  PhishingController.maybeUpdateState();
  return PhishingController.test(origin);
};

/**
 * Gets detailed phishing test results for an origin
 * @param {string} origin - URL origin or hostname to check
 * @returns {PhishingDetectorResult} Phishing test result object or null if protection is disabled
 */
export const getPhishingTestResultAsync = async (
  origin: string,
): Promise<PhishingDetectorResult> => {
  const { PhishingController } = Engine.context as {
    PhishingController: PhishingControllerClass;
  };

  if (isProductSafetyDappScanningEnabled()) {
    const scanResult = await PhishingController.scanUrl(origin);
    return {
      result:
        scanResult.recommendedAction === RecommendedAction.None ||
        scanResult.recommendedAction === RecommendedAction.Warn,
      name: 'Product safety dapp scanning is enabled',
      type: 'DAPP_SCANNING' as PhishingDetectorResultType,
    };
  }
  PhishingController.maybeUpdateState();
  return PhishingController.test(origin);
};
