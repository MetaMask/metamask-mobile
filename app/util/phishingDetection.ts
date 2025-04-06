import { PhishingDetectorResult, PhishingDetectorResultType, RecommendedAction } from '@metamask/phishing-controller';
import Engine from '../core/Engine';
import { store } from '../store';
import { selectBasicFunctionalityEnabled } from '../selectors/settings';
import { selectProductSafetyDappScanningEnabled } from '../selectors/featureFlagController';
import Logger from '../util/Logger';

// Cache for domains that have been scanned
const scannedDomains: Record<string, boolean> = {};

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
 * Gets detailed phishing test results for an origin
 * @param {string} origin - URL origin or hostname to check
 * @returns {PhishingDetectorResult} Phishing test result object or null if protection is disabled
 */
export const getPhishingTestResult = (origin: string): PhishingDetectorResult => {
  if (!isPhishingDetectionEnabled()) {
    return { result: false, name: 'Phishing protection is disabled', type: PhishingDetectorResultType.All };
  }

  if (isProductSafetyDappScanningEnabled()) {
    return { result: false, name: 'Product safety dapp scanning is enabled', type: PhishingDetectorResultType.All };
  }


  const PhishingController = Engine.context.PhishingController;
  PhishingController.maybeUpdateState();
  return PhishingController.test(origin);
};

/**
 * Gets detailed phishing test results for an origin
 * @param {string} origin - URL origin or hostname to check
 * @returns {PhishingDetectorResult} Phishing test result object or null if protection is disabled
 */
export const getPhishingTestResultAsync = async (origin: string): Promise<PhishingDetectorResult> => {
  if (!isPhishingDetectionEnabled()) {
    return { result: false, name: 'Phishing protection is disabled', type: PhishingDetectorResultType.All };
  }

  if (isProductSafetyDappScanningEnabled()) {
    Logger.log('Real time dapp scanning enabled');
    const PhishingController = Engine.context.PhishingController;
    
    try {
      const hostname = new URL(origin).hostname;
      
      // Check if domain has already been scanned
      if (scannedDomains[hostname] !== undefined) {
        return { 
          result: !scannedDomains[hostname], 
          name: scannedDomains[hostname] ? 'Safe site' : 'Blocked by real-time scanning', 
          type: PhishingDetectorResultType.All 
        };
      }
      
      const scanResult = await PhishingController.scanUrl(origin);

      if (scanResult.fetchError) {
        // Log error but don't block the site based on a failed scan
        Logger.log(
          '[PhishingDetection] Fetch error:',
          scanResult.fetchError,
        );
        scannedDomains[hostname] = true;
        return { result: false, name: 'Scan failed, proceeding with caution', type: PhishingDetectorResultType.All };
      }

      const isAllowed = !(
        scanResult.recommendedAction === RecommendedAction.Block ||
        scanResult.recommendedAction === RecommendedAction.Warn
      );

      scannedDomains[hostname] = isAllowed;
      
      return { 
        result: !isAllowed, 
        name: isAllowed ? 'Safe site' : 'Blocked by real-time scanning', 
        type: PhishingDetectorResultType.All 
      };
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      Logger.error(errorObj, { context: '[PhishingDetection] Error during real-time scanning' });
      return { result: false, name: 'Error during scan', type: PhishingDetectorResultType.All };
    }
  }
  
  const PhishingController = Engine.context.PhishingController;
  PhishingController.maybeUpdateState();
  return PhishingController.test(origin);
};