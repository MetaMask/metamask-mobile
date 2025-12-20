/* eslint-disable import/prefer-default-export */
import { createSelector, weakMapMemoize } from 'reselect';
import { TokenRatesControllerState } from '@metamask/assets-controllers';
import { RootState } from '../reducers';
import { selectEvmChainId } from './networkController';
import { Hex } from '@metamask/utils';
import { createDeepEqualSelector } from './util';
import { toChecksumAddress } from '../util/address';

/**
 * Mapping of aToken addresses to their underlying token addresses.
 * Used as price fallback when aToken price data is unavailable from the API.
 * aTokens maintain 1:1 value with underlying assets.
 *
 * This is a temporary solution until the price API includes aToken prices.
 */
const ATOKEN_TO_UNDERLYING_MAP: Record<Hex, Record<Hex, Hex>> = {
  // Mainnet (chainId: 0x1)
  '0x1': {
    // amUSD -> mUSD
    '0xaa0200d169ff3ba9385c12e073c5d1d30434ae7b':
      '0xaca92e438df0b2401ff60da7e4337b687a2435da',
  },
  // Linea Mainnet (chainId: 0xe708)
  '0xe708': {
    // amUSD -> mUSD
    '0x61b19879f4033c2b5682a969cccc9141e022823c':
      '0xaca92e438df0b2401ff60da7e4337b687a2435da',
  },
};

/**
 * utility similar to lodash.mapValues.
 * provides a clean abstraction for us to reconfigure this large marketData object
 * @param obj - object to reconfigure
 * @param fn - callback to configure each entry in this object
 * @returns - newly reconfigured object
 */
const mapValues = <K extends string, T, U>(
  obj: Record<K, T>,
  fn: (value: T) => U,
): Record<K, U> =>
  Object.fromEntries(
    Object.entries(obj ?? {}).map(([key, value]) => [key, fn(value as T)]),
  ) as Record<K, U>;

const selectTokenRatesControllerState = (state: RootState) =>
  state.engine.backgroundState.TokenRatesController;

/**
 * Finds token price data using case-insensitive address lookup.
 * Raw market data may have addresses in various cases, so we normalize for comparison.
 */
const getTokenPriceData = (
  chainMarketData: Record<string, unknown> | undefined,
  address: string,
) => {
  if (!chainMarketData) return undefined;
  const lowercaseAddress = address.toLowerCase();
  // Find the key that matches case-insensitively
  const matchingKey = Object.keys(chainMarketData).find(
    (key) => key.toLowerCase() === lowercaseAddress,
  );
  return matchingKey
    ? (chainMarketData[matchingKey] as { price?: number } | undefined)
    : undefined;
};

/**
 * Enriched market data selector that adds aToken price fallbacks.
 * For aTokens without direct price data, uses the underlying token's price.
 */
export const selectTokenMarketData = createSelector(
  selectTokenRatesControllerState,
  (tokenRatesControllerState: TokenRatesControllerState) => {
    const rawMarketData = tokenRatesControllerState.marketData;
    const enrichedMarketData = { ...rawMarketData };

    for (const [chainId, aTokenMappings] of Object.entries(
      ATOKEN_TO_UNDERLYING_MAP,
    )) {
      const hexChainId = chainId as Hex;
      const chainMarketData = enrichedMarketData[hexChainId];
      if (!chainMarketData) continue;

      enrichedMarketData[hexChainId] = { ...chainMarketData };

      for (const [aTokenAddress, underlyingAddress] of Object.entries(
        aTokenMappings,
      )) {
        // Skip if aToken already has price data
        const existingATokenData = getTokenPriceData(
          enrichedMarketData[hexChainId],
          aTokenAddress,
        );
        if (existingATokenData?.price !== undefined) continue;

        // Copy underlying token's price data to aToken
        const underlyingTokenData = getTokenPriceData(
          enrichedMarketData[hexChainId],
          underlyingAddress,
        );
        if (underlyingTokenData?.price !== undefined) {
          const checksummedAToken = toChecksumAddress(aTokenAddress) as Hex;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (enrichedMarketData[hexChainId] as any)[checksummedAToken] =
            underlyingTokenData;
        }
      }
    }

    return enrichedMarketData;
  },
);

export const selectContractExchangeRates = createSelector(
  selectEvmChainId,
  selectTokenRatesControllerState,
  (chainId: Hex, tokenRatesControllerState: TokenRatesControllerState) =>
    tokenRatesControllerState.marketData[chainId],
);

export const selectContractExchangeRatesByChainId = createSelector(
  [selectTokenMarketData, (_state: RootState, chainId: Hex) => chainId],
  (marketData, chainId) => marketData?.[chainId],
);

export function selectPricePercentChange1d(
  state: RootState,
  chainId: Hex,
  tokenAddress: Hex,
) {
  const marketData = selectTokenMarketData(state);
  const chainData = marketData?.[chainId];
  // Use case-insensitive lookup for consistent behavior
  const tokenData = getTokenPriceData(chainData, tokenAddress) as
    | { pricePercentChange1d?: number }
    | undefined;
  return tokenData?.pricePercentChange1d;
}

export const selectSingleTokenPriceMarketData = createSelector(
  [
    (state: RootState, chainId: Hex, tokenAddress: Hex) => {
      const marketData = selectTokenMarketData(state);
      const chainData = marketData?.[chainId];
      // Use case-insensitive lookup since enriched data uses checksummed keys
      const tokenData = getTokenPriceData(chainData, tokenAddress);
      return tokenData?.price;
    },
    (_state: RootState, chainId: Hex) => chainId,
    (_state: RootState, _chainId: Hex, tokenAddress: Hex) => tokenAddress,
  ],
  (price, _chainId, address) => {
    // Return with checksummed key to match lookup in deriveBalanceFromAssetMarketDetails
    const checksummedAddress = toChecksumAddress(address) as Hex;
    return price ? { [checksummedAddress]: { price } } : {};
  },
  {
    memoize: weakMapMemoize,
    argsMemoize: weakMapMemoize,
  },
);

export const selectTokenMarketPriceData = createDeepEqualSelector(
  [selectTokenMarketData],
  (marketData) => {
    const marketPriceData = mapValues(marketData, (tokenData) =>
      mapValues(tokenData, (tokenInfo) => ({ price: tokenInfo?.price })),
    );

    return marketPriceData;
  },
);

export const selectTokenMarketDataByChainId = createSelector(
  [selectTokenMarketData, (_state: RootState, chainId: Hex) => chainId],
  (marketData, chainId) => marketData?.[chainId] || {},
);
