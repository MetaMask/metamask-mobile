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

export const selectMarketData = createSelector(
  selectTokenRatesControllerState,
  (tokenRatesControllerState: TokenRatesControllerState) =>
    // TODO: CONTROLLER WORK: Market data is only fetching for the current chain
    // while extension is pulling all market data we may need to update the
    // controller to fetch all market data
    // Waiting for core release for this to support multi chain:
    // https://github.com/MetaMask/core/pull/4832/files
    tokenRatesControllerState.marketData,
);
