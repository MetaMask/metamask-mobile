import { RootState } from '../reducers';
import { createDeepEqualSelector } from './util';
import { generateAddressCacheKey } from '../lib/address-scanning/address-scan-util';
import {
  TokenScanCacheData,
  AddressScanResult,
} from '@metamask/phishing-controller';

const selectTokenScanCache = (state: RootState) =>
  state.engine.backgroundState.PhishingController?.tokenScanCache;

const selectAddressScanCache = (state: RootState) =>
  state.engine.backgroundState.PhishingController?.addressScanCache;

const selectUrlScanCache = (state: RootState) =>
  state.engine.backgroundState.PhishingController?.urlScanCache;

/**
 * Select the scan results for multiple token addresses
 *
 * @param state - Redux root state
 * @param params - Parameters object
 * @param params.tokens - Array of token objects with address and chainId
 * @returns Array of scan results with their addresses
 */
export const selectMultipleTokenScanResults = createDeepEqualSelector(
  selectTokenScanCache,
  (
    _state: RootState,
    params: { tokens: { address: string; chainId: string }[] },
  ) => params.tokens,
  (tokenScanCache, tokens) => {
    if (!tokens || tokens.length === 0) {
      return [];
    }

    const cache = tokenScanCache || {};

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

      const cacheKey = generateAddressCacheKey(chainId, address);
      const cacheEntry = cache[cacheKey];

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
  selectAddressScanCache,
  (
    _state: RootState,
    params: { addresses: { address: string; chainId: string }[] },
  ) => params.addresses,
  (
    addressScanCache,
    addresses,
  ): {
    address: string;
    chainId: string;
    scanResult: AddressScanResult | undefined;
  }[] => {
    if (!addresses || addresses.length === 0) {
      return [];
    }

    const cache = addressScanCache || {};

    return addresses.map((addressItem) => {
      const { address, chainId } = addressItem;

      if (!address || !chainId) {
        return {
          address: address?.toLowerCase() || '',
          chainId: chainId || '',
          scanResult: undefined,
        };
      }

      const cacheKey = generateAddressCacheKey(chainId, address);
      const cacheEntry = cache[cacheKey];

      return {
        address: address.toLowerCase(),
        chainId,
        scanResult: cacheEntry?.data,
      };
    });
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
  selectUrlScanCache,
  (_state: RootState, params: { hostname: string | undefined }) =>
    params.hostname,
  (urlScanCache, hostname) => {
    if (!hostname) {
      return null;
    }

    const cache = urlScanCache || {};
    const cacheEntry = cache[hostname];

    return {
      hostname,
      scanResult: cacheEntry?.data,
    };
  },
);
