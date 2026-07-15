import { createSelector } from 'reselect';
import type { RootState } from '../../reducers';
import {
  type BridgeControllerState,
  selectMinimumBalanceForRentExemptionInSOL,
} from '@metamask/bridge-controller';
import { selectControllerFields } from '../../core/redux/slices/bridge';

export const selectBridgeControllerState = (state: RootState) =>
  state.engine.backgroundState.BridgeController;

export const selectQuoteRequest = createSelector(
  selectBridgeControllerState,
  (bridgeControllerState: BridgeControllerState) =>
    bridgeControllerState.quoteRequest[0],
);

// Use the official bridge controller selector
export const selectMinSolBalance = createSelector(
  selectControllerFields,
  (bridgeAppState) => selectMinimumBalanceForRentExemptionInSOL(bridgeAppState),
);
