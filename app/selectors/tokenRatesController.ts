/* eslint-disable import/prefer-default-export */
import { createSelector } from 'reselect';
import { TokenRatesControllerState } from '@metamask/assets-controllers';
import { RootState } from '../reducers';
import { selectChainId } from './networkController';
import { Hex } from '@metamask/utils';

const selectTokenRatesControllerState = (state: RootState) =>
  state.engine.backgroundState.TokenRatesController;

export const selectContractExchangeRates = createSelector(
  selectChainId,
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

export const selectTokenMarketDataByChainId = createSelector(
  [selectTokenMarketData, (_state: RootState, chainId: Hex) => chainId],
  (marketData, chainId) => marketData?.[chainId] || {},
);
