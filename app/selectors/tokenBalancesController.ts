/* eslint-disable import/prefer-default-export */
import { createSelector } from 'reselect';
import { TokenBalancesState } from '@metamask/assets-controllers';
import { RootState } from '../reducers';

const selectTokenBalancesControllerState = (state: RootState) =>
  state.engine.backgroundState.TokenBalancesController;

export const selectContractBalances = createSelector(
  selectTokenBalancesControllerState,
  (tokenBalancesControllerState: TokenBalancesState) =>
    tokenBalancesControllerState.contractBalances,
);
