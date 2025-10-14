import { createSelector } from 'reselect';
import { BridgeHistoryItem } from '@metamask/bridge-status-controller';
import { selectSelectedAccountGroupWithInternalAccountsAddresses } from '../multichainAccounts/accountTreeController';
import { RootState } from '../../reducers';
import { isEthAddress } from '../../util/address';
import { toChecksumHexAddress } from '@metamask/controller-utils';

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

    const addressesSet = new Set(
      accountGroupAddresses.filter(
        (address): address is string => address != null,
      ),
    );

    return Object.keys(txHistory).reduce<Record<string, BridgeHistoryItem>>(
      (acc, txMetaId) => {
        const txHistoryItem = txHistory[txMetaId];
        const account = txHistoryItem.account;

        const nonEvmHasMatch =
          !isEthAddress(account) && addressesSet.has(account);
        const evmHasMatch =
          isEthAddress(account) &&
          (addressesSet.has(account.toLowerCase()) ||
            addressesSet.has(toChecksumHexAddress(account)));

        if (nonEvmHasMatch || evmHasMatch) {
          acc[txMetaId] = txHistoryItem;
        }
        return acc;
      },
      {},
    );
  },
);
