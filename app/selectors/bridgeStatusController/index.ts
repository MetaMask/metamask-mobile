import { createSelector } from 'reselect';
import { BridgeHistoryItem } from '@metamask/bridge-status-controller';
import { selectSelectedAccountGroupWithInternalAccountsAddresses } from '../multichainAccounts/accountTreeController';
import { RootState } from '../../reducers';
import { isEthAddress } from '../../util/address';

export const selectBridgeStatusState = (state: RootState) =>
  state.engine.backgroundState.BridgeStatusController;

/**
 * Returns a mapping of srcTxMetaId to txHistoryItem for any account in the current account group
 */
export const selectBridgeHistoryForAccount = createSelector(
  [
    selectSelectedAccountGroupWithInternalAccountsAddresses,
    selectBridgeStatusState,
  ],
  (accountGroupAddresses, bridgeStatusState) => {
    // Handle the case when bridgeStatusState is undefined
    const { txHistory = {} } = bridgeStatusState || {};

    // Convert addresses to lowercase Set for efficient lookup
    const addressesSet = new Set(
      accountGroupAddresses
        .filter((address): address is string => address != null)
        .map((address) => address.toLowerCase()),
    );

    return Object.keys(txHistory).reduce<Record<string, BridgeHistoryItem>>(
      (acc, txMetaId) => {
        const txHistoryItem = txHistory[txMetaId];
        const txHistoryItemAccount = isEthAddress(txHistoryItem.account)
          ? txHistoryItem.account?.toLowerCase()
          : txHistoryItem.account;
        if (addressesSet.has(txHistoryItemAccount)) {
          acc[txMetaId] = txHistoryItem;
        }
        return acc;
      },
      {},
    );
  },
);
