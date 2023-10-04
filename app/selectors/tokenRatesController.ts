/* eslint-disable import/prefer-default-export */
import { createSelector } from 'reselect';
import { TokenRatesState } from '@metamask/assets-controllers';
import { RootState } from '../reducers';

const selectTokenRatesControllerState = (state: RootState) =>
  state.engine.backgroundState.TokenRatesController;

export const selectContractExchangeRates = createSelector(
  selectTokenRatesControllerState,
  (tokenRatesControllerState: TokenRatesState) =>
    tokenRatesControllerState.contractExchangeRates,
);
