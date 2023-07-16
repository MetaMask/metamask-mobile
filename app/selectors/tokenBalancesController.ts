/* eslint-disable import/prefer-default-export */
import { createSelector } from 'reselect';
import { TokenBalancesState } from '@metamask/assets-controllers';
import { EngineState } from './types';

const selectTokenBalancesControllerState = (state: EngineState) =>
  state.engine.backgroundState.TokenBalancesController;

export const selectContractBalances = createSelector(
  selectTokenBalancesControllerState,
  (tokenBalancesControllerState: TokenBalancesState) =>
    tokenBalancesControllerState.contractBalances,
);
