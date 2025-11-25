import { RootState } from '../reducers';
import { createDeepEqualSelector } from './util';
import { generateAddressCacheKey } from '../lib/address-scanning/address-scan-util';
import { TokenScanCacheData } from '@metamask/phishing-controller';

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

    return addresses.reduce<
      {
        address: string;
        chainId: string;
        scanResult: unknown;
      }[]
    >((acc, addressItem) => {
      const { address, chainId } = addressItem;

      if (!address || !chainId) {
        return acc;
      }

      const cacheKey = generateAddressCacheKey(chainId, address);
      const cacheEntry = addressScanCache[cacheKey];

      acc.push({
        address: address.toLowerCase(),
        chainId,
        scanResult: cacheEntry?.data,
      });

      return acc;
    }, []);
  },
);

/**
 * Select the scan result for a hostname
 *
 * @param state - Redux root state
 * @param params - Parameters object
 * @param params.hostname - Hostname to check (not full URL)
 * @returns Scan result for the hostname
 */
export const selectUrlScanResult = createDeepEqualSelector(
  selectPhishingControllerState,
  (_state: RootState, params: { hostname: string | undefined }) =>
    params.hostname,
  (phishingControllerState, hostname) => {
    if (!hostname) {
      return null;
    }

    const urlScanCache = phishingControllerState?.urlScanCache || {};
    const cacheEntry = urlScanCache[hostname];

    return {
      hostname,
      scanResult: cacheEntry?.data,
    };
  },
);
