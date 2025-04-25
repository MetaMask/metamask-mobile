import { createSelector } from 'reselect';
import { RootState } from '../reducers';
import { createDeepEqualSelector } from './util';

const selectMultichainBalancesControllerState = (state: RootState) =>
  state.engine.backgroundState.MultichainBalancesController;

export const selectMultichainBalances = createDeepEqualSelector(
  [selectMultichainBalancesControllerState],
  (multichainBalancesControllerState) => multichainBalancesControllerState.balances,
);