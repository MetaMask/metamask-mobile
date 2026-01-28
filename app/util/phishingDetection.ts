import {
  PhishingDetectorResult,
  PhishingDetectorResultType,
  PhishingController as PhishingControllerClass,
  RecommendedAction,
} from '@metamask/phishing-controller';
import { isSnapId } from '@metamask/snaps-utils';
import Engine from '../core/Engine';
import { prefixUrlWithProtocol } from './browser';

/**
 * Gets detailed phishing test results for an origin using the dapp scanning API
 * @param {string} origin - URL origin or hostname to check
 * @returns {PhishingDetectorResult} Phishing test result object - result is true if the site is UNSAFE
 */
export const getPhishingTestResultAsync = async (
  origin: string,
): Promise<PhishingDetectorResult> => {
  const { PhishingController } = Engine.context as {
    PhishingController: PhishingControllerClass;
  };

  const scanResult = await PhishingController.scanUrl(origin);
  return {
    // result is true if site is UNSAFE (Block action)
    result:
      scanResult.recommendedAction !== RecommendedAction.None &&
      scanResult.recommendedAction !== RecommendedAction.Warn &&
      scanResult.recommendedAction !== RecommendedAction.Verified,
    name: 'Product safety dapp scanning',
    type: 'DAPP_SCANNING' as PhishingDetectorResultType,
  };
};

/**
 * Prepares a URL for phishing detection by adding protocol prefix if needed.
 * Snap IDs are returned as-is since they don't need protocol prefixing.
 * @param {string} url - The URL or snap ID to prepare
 * @returns {string} The URL with protocol prefix, or original snap ID
 */
export const prepareUrlForPhishingCheck = (url: string): string => {
  if (isSnapId(url)) {
    return url;
  }
  return prefixUrlWithProtocol(url);
};
