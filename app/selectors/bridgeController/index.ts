import { createSelector } from 'reselect';
import { RootState } from '../../reducers';
import { BridgeControllerState } from '@metamask/bridge-controller';
export const selectBridgeControllerState = (state: RootState) =>
    state.engine.backgroundState.BridgeController;

export const selectQuoteRequest = createSelector(
    selectBridgeControllerState,
    (bridgeControllerState: BridgeControllerState) => bridgeControllerState.quoteRequest,
);
