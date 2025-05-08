/* eslint-disable import/prefer-default-export */
import { createSelector } from 'reselect';
import { TokenRatesControllerState } from '@metamask/assets-controllers';
import { RootState } from '../reducers';
import { selectEvmChainId } from './networkController';
import { Hex } from '@metamask/utils';
import { createDeepEqualSelector } from './util';

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

export const selectContractExchangeRates = createSelector(
  selectEvmChainId,
  selectTokenRatesControllerState,
  (chainId: Hex, tokenRatesControllerState: TokenRatesControllerState) =>
    tokenRatesControllerState.marketData[chainId],
);

export const selectContractExchangeRatesByChainId = createSelector(
  selectTokenRatesControllerState,
  (_state: RootState, chainId: Hex) => chainId,
  (tokenRatesControllerState: TokenRatesControllerState, chainId: Hex) =>
    tokenRatesControllerState.marketData[chainId],
);

export const selectTokenMarketData = createSelector(
  selectTokenRatesControllerState,
  (tokenRatesControllerState: TokenRatesControllerState) =>
    tokenRatesControllerState.marketData,
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
