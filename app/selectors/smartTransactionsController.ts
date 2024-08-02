import { NETWORKS_CHAIN_ID } from '../constants/network';
import { selectSmartTransactionsOptInStatus } from './preferencesController';
import { RootState } from '../reducers';
import { swapsSmartTxFlagEnabled } from '../reducers/swaps';
import { isHardwareAccount } from '../util/address';
import { selectChainId, selectProviderConfig } from './networkController';
import {
  SmartTransaction,
  SmartTransactionStatuses,
} from '@metamask/smart-transactions-controller/dist/types';
import { selectSelectedInternalAccountChecksummedAddress } from './accountsController';

export const ALLOWED_SMART_TRANSACTIONS_CHAIN_IDS = [
  NETWORKS_CHAIN_ID.MAINNET,
  NETWORKS_CHAIN_ID.GOERLI,
  NETWORKS_CHAIN_ID.SEPOLIA,
];
export const selectSmartTransactionsEnabled = (state: RootState) => {
  const selectedAddress =
    selectSelectedInternalAccountChecksummedAddress(state);
  const addrIshardwareAccount = selectedAddress
    ? isHardwareAccount(selectedAddress)
    : false;
  const chainId = selectChainId(state);
  const providerConfigRpcUrl = selectProviderConfig(state).rpcUrl;

  const isAllowedNetwork =
    ALLOWED_SMART_TRANSACTIONS_CHAIN_IDS.includes(chainId);

  // E.g. if a user has a Mainnet Flashbots RPC, we do not want to bypass it
  // Only want to bypass on default mainnet RPC
  const canBypassRpc =
    chainId === NETWORKS_CHAIN_ID.MAINNET
      ? providerConfigRpcUrl === undefined
      : true;

  const smartTransactionsFeatureFlagEnabled = swapsSmartTxFlagEnabled(state);

  const smartTransactionsLiveness =
    state.engine.backgroundState.SmartTransactionsController
      .smartTransactionsState?.liveness;

  return Boolean(
    isAllowedNetwork &&
      canBypassRpc &&
      !addrIshardwareAccount &&
      smartTransactionsFeatureFlagEnabled &&
      smartTransactionsLiveness,
  );
};
export const selectShouldUseSmartTransaction = (state: RootState) => {
  const isSmartTransactionsEnabled = selectSmartTransactionsEnabled(state);
  const smartTransactionsOptInStatus =
    selectSmartTransactionsOptInStatus(state);

  return isSmartTransactionsEnabled && smartTransactionsOptInStatus;
};

export const selectPendingSmartTransactionsBySender = (state: RootState) => {
  const selectedAddress =
    selectSelectedInternalAccountChecksummedAddress(state);
  const chainId = selectChainId(state);

  const smartTransactions: SmartTransaction[] =
    state.engine.backgroundState.SmartTransactionsController
      ?.smartTransactionsState?.smartTransactions?.[chainId] || [];

  const pendingSmartTransactions =
    smartTransactions
      ?.filter((stx) => {
        const { txParams } = stx;
        return (
          txParams?.from.toLowerCase() === selectedAddress?.toLowerCase() &&
          ![
            SmartTransactionStatuses.SUCCESS,
            SmartTransactionStatuses.CANCELLED,
          ].includes(stx.status as SmartTransactionStatuses)
        );
      })
      .map((stx) => ({
        ...stx,
        // stx.uuid is one from sentinel API, not the same as tx.id which is generated client side
        // Doesn't matter too much because we only care about the pending stx, confirmed txs are handled like normal
        // However, this does make it impossible to read Swap data from TxController.swapsTransactions as that relies on client side tx.id
        // To fix that we do transactionController.update({ swapsTransactions: newSwapsTransactions }) in app/util/smart-transactions/smart-tx.ts
        id: stx.uuid,
        status: stx.status?.startsWith(SmartTransactionStatuses.CANCELLED)
          ? SmartTransactionStatuses.CANCELLED
          : stx.status,
        isSmartTransaction: true,
      })) ?? [];

  return pendingSmartTransactions;
};
