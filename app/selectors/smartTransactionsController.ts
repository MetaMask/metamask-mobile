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
import { selectSelectedInternalAccountFormattedAddress } from './accountsController';
import { getAllowedSmartTransactionsChainIds } from '../../app/constants/smartTransactions';

export const selectSmartTransactionsEnabled = (
  state: RootState,
  providedChainId?: string,
) => {
  const selectedAddress = selectSelectedInternalAccountFormattedAddress(state);
  const addrIshardwareAccount = selectedAddress
    ? isHardwareAccount(selectedAddress)
    : false;
  const chainId = providedChainId || selectChainId(state);
  const providerConfigRpcUrl = selectProviderConfig(state).rpcUrl;

  const isAllowedNetwork =
    getAllowedSmartTransactionsChainIds().includes(chainId);

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
export const selectShouldUseSmartTransaction = (
  state: RootState,
  providedChainId?: string,
) => {
  const isSmartTransactionsEnabled = selectSmartTransactionsEnabled(
    state,
    providedChainId,
  );
  const smartTransactionsOptInStatus =
    selectSmartTransactionsOptInStatus(state);

  return isSmartTransactionsEnabled && smartTransactionsOptInStatus;
};

export const selectPendingSmartTransactionsBySender = (state: RootState) => {
  const selectedAddress = selectSelectedInternalAccountFormattedAddress(state);
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
        // To fix that we create a duplicate swaps transaction for the stx.uuid in the smart publish hook.
        id: stx.uuid,
        status: stx.status?.startsWith(SmartTransactionStatuses.CANCELLED)
          ? SmartTransactionStatuses.CANCELLED
          : stx.status,
        isSmartTransaction: true,
      })) ?? [];

  return pendingSmartTransactions;
};
