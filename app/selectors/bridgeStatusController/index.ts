import { createSelector } from 'reselect';
import { BridgeHistoryItem } from '@metamask/bridge-status-controller';
import { selectSelectedInternalAccountAddress } from '../accountsController';
import { RootState } from '../../reducers';
import { areAddressesEqual } from '../../util/address';

export const selectBridgeStatusState = (state: RootState) =>
  state.engine.backgroundState.BridgeStatusController;

/**
 * Returns a mapping of srcTxMetaId to txHistoryItem for the selected address
 */
export const selectBridgeHistoryForAccount = createSelector(
  [selectSelectedInternalAccountAddress, selectBridgeStatusState],
  (selectedAddress, bridgeStatusState) => {
    // Handle the case when bridgeStatusState is undefined
    const { txHistory = {} } = bridgeStatusState || {};

    return Object.keys(txHistory).reduce<Record<string, BridgeHistoryItem>>(
      (acc, txMetaId) => {
        const txHistoryItem = txHistory[txMetaId];
        if (areAddressesEqual(txHistoryItem.account, selectedAddress || '')) {
          acc[txMetaId] = txHistoryItem;
        }
        return acc;
      },
      {},
    );
  },
);
