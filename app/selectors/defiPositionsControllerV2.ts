import { createSelector } from 'reselect';
import type { DeFiPositionsByAccount } from '@metamask/assets-controllers';
import { RootState } from '../reducers';

const selectDeFiPositionsControllerV2State = (state: RootState) =>
  state?.engine?.backgroundState?.DeFiPositionsControllerV2;

/**
 * Selects DeFi positions V2 state keyed by internal account ID.
 */
export const selectDeFiPositionsV2State = createSelector(
  selectDeFiPositionsControllerV2State,
  (controllerState): DeFiPositionsByAccount =>
    controllerState?.allDeFiPositionsV2 ?? {},
);
