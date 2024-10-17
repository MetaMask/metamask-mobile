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
