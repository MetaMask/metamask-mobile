import { RootState } from '../reducers';
import { createDeepEqualSelector } from './util';
import { safeToChecksumAddress } from '../util/address';

const selectPhishingControllerState = (state: RootState) =>
  state.engine.backgroundState.PhishingController;

/**
 * Select the scan result for a specific token address
 *
 * @param state - Redux root state
 * @param params - Parameters object
 * @param params.tokenAddress - Token contract address
 * @param params.chainId - Chain ID (optional)
 * @returns The scan result for the specified token, or undefined if not found
 */
export const selectTokenScanResult = createDeepEqualSelector(
  selectPhishingControllerState,
  (_state: RootState, params: { tokenAddress: string; chainId: string }) =>
    params,
  (phishingControllerState, params) => {
    const { tokenAddress, chainId } = params;

    if (!tokenAddress) {
      return undefined;
    }

    const checksumAddress = safeToChecksumAddress(tokenAddress);
    if (!checksumAddress) {
      return undefined;
    }

    const tokenScanCache = phishingControllerState?.tokenScanCache || {};

    let cacheEntry;
    if (chainId) {
      const cacheKey = `${chainId}:${checksumAddress.toLowerCase()}`;
      cacheEntry = tokenScanCache[cacheKey];
    }

    if (!cacheEntry) {
      cacheEntry =
        tokenScanCache[checksumAddress] ||
        tokenScanCache[checksumAddress.toLowerCase()] ||
        tokenScanCache[tokenAddress.toLowerCase()];
    }

    return cacheEntry?.data;
  },
);
