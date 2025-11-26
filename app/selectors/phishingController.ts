import type { TokenScanCacheData } from '@metamask/phishing-controller';
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

    return tokens.reduce<
      {
        address: string;
        chainId: string;
        scanResult: TokenScanCacheData;
      }[]
    >((acc, token) => {
      const { address, chainId } = token;

      if (!address || !chainId) {
        return acc;
      }

      const cacheKey = `${chainId}:${address.toLowerCase()}`;
      const cacheEntry = tokenScanCache[cacheKey];

      acc.push({
        address: address.toLowerCase(),
        chainId,
        scanResult: cacheEntry?.data,
      });

      return acc;
    }, []);
  },
);
