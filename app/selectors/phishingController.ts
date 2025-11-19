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
