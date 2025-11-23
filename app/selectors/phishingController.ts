import { RootState } from '../reducers';
import { createDeepEqualSelector } from './util';

const selectPhishingControllerState = (state: RootState) =>
  state.engine.backgroundState.PhishingController;

/**
 * Select the scan results for multiple token addresses
 *
 * @param state - Redux root state
 * @param params - Parameters object
 * @param params.tokens - Array of token objects with address and chainId
 * @returns Array of scan results with their addresses
 */
export const selectMultipleTokenScanResults = createDeepEqualSelector(
  selectPhishingControllerState,
  (
    _state: RootState,
    params: { tokens: { address: string; chainId: string }[] },
  ) => params.tokens,
  (phishingControllerState, tokens) => {
    if (!tokens || tokens.length === 0) {
      return [];
    }

    const tokenScanCache = phishingControllerState?.tokenScanCache || {};

    return tokens
      .map((token) => {
        const { address, chainId } = token;

        if (!address || !chainId) {
          return null;
        }

        const cacheKey = `${chainId}:${address.toLowerCase()}`;
        const cacheEntry = tokenScanCache[cacheKey];

        return {
          address: address.toLowerCase(),
          chainId,
          scanResult: cacheEntry?.data,
        };
      })
      .filter(
        (result): result is NonNullable<typeof result> => result !== null,
      );
  },
);

/**
 * Select the scan results for multiple addresses
 *
 * @param state - Redux root state
 * @param params - Parameters object
 * @param params.addresses - Array of address objects with address and chainId
 * @returns Array of scan results with their addresses
 */
export const selectMultipleAddressScanResults = createDeepEqualSelector(
  selectPhishingControllerState,
  (
    _state: RootState,
    params: { addresses: { address: string; chainId: string }[] },
  ) => params.addresses,
  (phishingControllerState, addresses) => {
    if (!addresses || addresses.length === 0) {
      return [];
    }

    const addressScanCache = phishingControllerState?.addressScanCache || {};

    return addresses
      .map((addressItem) => {
        const { address, chainId } = addressItem;

        if (!address || !chainId) {
          return null;
        }

        const cacheKey = `${chainId}:${address.toLowerCase()}`;
        const cacheEntry = addressScanCache[cacheKey];

        return {
          address: address.toLowerCase(),
          chainId,
          scanResult: cacheEntry?.data,
        };
      })
      .filter(
        (result): result is NonNullable<typeof result> => result !== null,
      );
  },
);

/**
 * Select the scan result for a URL/origin
 *
 * @param state - Redux root state
 * @param params - Parameters object
 * @param params.url - URL to check
 * @returns Scan result for the URL
 */
export const selectUrlScanResult = createDeepEqualSelector(
  selectPhishingControllerState,
  (_state: RootState, params: { url: string | undefined }) => params.url,
  (phishingControllerState, url) => {
    if (!url) {
      return null;
    }

    const urlScanCache = phishingControllerState?.urlScanCache || {};

    // Extract hostname from URL since cache is keyed by hostname
    let hostname = url;
    try {
      const urlObj = new URL(url);
      hostname = urlObj.hostname;
    } catch (error) {
      // If URL parsing fails, try using it as-is
      // This handles cases where it might already be a hostname
    }
    const cacheEntry = urlScanCache[hostname];

    return {
      url,
      scanResult: cacheEntry?.data,
    };
  },
);
