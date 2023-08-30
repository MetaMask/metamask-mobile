/* eslint-disable import/prefer-default-export */
import { createSelector } from 'reselect';
import { TokenRatesState } from '@metamask/assets-controllers';
import { EngineState } from './types';

const selectTokenRatesControllerState = (state: EngineState) =>
  state.engine.backgroundState.TokenRatesController;

export const selectContractExchangeRates = createSelector(
  selectTokenRatesControllerState,
  (tokenRatesControllerState: TokenRatesState) =>
    tokenRatesControllerState.contractExchangeRates,
);
