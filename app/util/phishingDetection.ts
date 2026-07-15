import {
  PhishingDetectorResult,
  PhishingDetectorResultType,
  PhishingController as PhishingControllerClass,
  RecommendedAction,
} from '@metamask/phishing-controller';
import Engine from '../core/Engine';

/**
 * Gets detailed phishing test results for a URL using the dapp scanning API.
 *
 * Callers should pass the complete URL (including path) so path-aware blocklist
 * entries on shared-host domains can be evaluated correctly.
 *
 * @param url - Full URL, origin, or hostname to check
 * @returns Phishing test result object — `result` is true if the site is UNSAFE
 */
export const getPhishingTestResultAsync = async (
  url: string,
): Promise<PhishingDetectorResult> => {
  const { PhishingController } = Engine.context as {
    PhishingController: PhishingControllerClass;
  };

  const scanResult = await PhishingController.scanUrl(url);
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
