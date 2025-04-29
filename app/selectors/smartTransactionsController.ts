import { NETWORKS_CHAIN_ID } from '../constants/network';
import { selectSmartTransactionsOptInStatus } from './preferencesController';
import { RootState } from '../reducers';
import { swapsSmartTxFlagEnabled } from '../reducers/swaps';
import { isHardwareAccount } from '../util/address';
import { selectEvmChainId, selectProviderConfig } from './networkController';
import {
  SmartTransaction,
  SmartTransactionStatuses,
} from '@metamask/smart-transactions-controller/dist/types';
import { selectSelectedInternalAccountFormattedAddress } from './accountsController';
import { getAllowedSmartTransactionsChainIds } from '../../app/constants/smartTransactions';
import { createDeepEqualSelector } from './util';

export const selectSmartTransactionsEnabled = createDeepEqualSelector(
  [
    selectSelectedInternalAccountFormattedAddress,
    selectEvmChainId,
    (state: RootState) => selectProviderConfig(state).rpcUrl,
    swapsSmartTxFlagEnabled,
    (state: RootState) =>
      state.engine.backgroundState.SmartTransactionsController
        .smartTransactionsState?.liveness,
  ],
  (
    selectedAddress,
    chainId,
    providerConfigRpcUrl,
    smartTransactionsFeatureFlagEnabled,
    smartTransactionsLiveness,
  ) => {
    const addrIshardwareAccount = selectedAddress
      ? isHardwareAccount(selectedAddress)
      : false;
    const isAllowedNetwork =
      getAllowedSmartTransactionsChainIds().includes(chainId);
    // Only bypass RPC if we're on the default mainnet RPC.
    const canBypassRpc =
      chainId === NETWORKS_CHAIN_ID.MAINNET
        ? providerConfigRpcUrl === undefined
        : true;
    return Boolean(
      isAllowedNetwork &&
        canBypassRpc &&
        !addrIshardwareAccount &&
        smartTransactionsFeatureFlagEnabled &&
        smartTransactionsLiveness,
    );
  },
);

export const selectShouldUseSmartTransaction = createDeepEqualSelector(
  [selectSmartTransactionsEnabled, selectSmartTransactionsOptInStatus],
  (smartTransactionsEnabled, smartTransactionsOptInStatus) =>
    smartTransactionsEnabled && smartTransactionsOptInStatus,
);

export const selectPendingSmartTransactionsBySender = createDeepEqualSelector(
  [
    selectSelectedInternalAccountFormattedAddress,
    selectEvmChainId,
    (state: RootState) =>
      state.engine.backgroundState.SmartTransactionsController
        ?.smartTransactionsState?.smartTransactions || {},
  ],
  (
    selectedAddress,
    chainId,
    smartTransactionsByChainId,
  ): SmartTransaction[] => {
    const smartTransactions: SmartTransaction[] =
      smartTransactionsByChainId[chainId] || [];
    return smartTransactions
      .filter((stx) => {
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
        // Use stx.uuid as the id since tx.id is generated client-side.
        id: stx.uuid,
        status: stx.status?.startsWith(SmartTransactionStatuses.CANCELLED)
          ? SmartTransactionStatuses.CANCELLED
          : stx.status,
        isSmartTransaction: true,
      }));
  },
);

export const selectSmartTransactionsForCurrentChain = (state: RootState) => {
  const chainId = selectEvmChainId(state);
  return (
    state.engine.backgroundState.SmartTransactionsController
      ?.smartTransactionsState?.smartTransactions?.[chainId] || []
  );
};
