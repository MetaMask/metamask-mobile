import { NETWORKS_CHAIN_ID } from '../constants/network';
import { selectSmartTransactionsOptInStatus } from './preferencesController';
import { RootState } from '../reducers';
import { swapsSmartTxFlagEnabled } from '../reducers/swaps';
import { isHardwareAccount } from '../util/address';
import { selectEvmChainId, selectRpcUrlByChainId } from './networkController';
import {
  SmartTransaction,
  SmartTransactionStatuses,
} from '@metamask/smart-transactions-controller/dist/types';
import { selectSelectedInternalAccountFormattedAddress } from './accountsController';
import { getAllowedSmartTransactionsChainIds } from '../../app/constants/smartTransactions';
import { createDeepEqualSelector } from './util';
import { isProduction } from '../util/environment';
import { Hex } from '@metamask/utils';

const getIsAllowedRpcUrlForSmartTransactions = (rpcUrl?: string) => {
  // Allow in non-production environments.
  if (!isProduction()) {
    return true;
  }

  const hostname = rpcUrl && new URL(rpcUrl).hostname;

  return (
    hostname?.endsWith('.infura.io') ||
    hostname?.endsWith('.binance.org') ||
    false
  );
};

export const selectSmartTransactionsEnabled = createDeepEqualSelector(
  [
    selectSelectedInternalAccountFormattedAddress,
    selectEvmChainId,
    (_state: RootState, chainId?: Hex) => chainId,
    (state: RootState, chainId?: Hex) =>
      selectRpcUrlByChainId(state, chainId || selectEvmChainId(state)),
    swapsSmartTxFlagEnabled,
    (state: RootState) =>
      state.engine.backgroundState.SmartTransactionsController
        .smartTransactionsState?.liveness,
  ],
  (
    selectedAddress,
    globalChainId,
    transactionChainId,
    providerConfigRpcUrl,
    smartTransactionsFeatureFlagEnabled,
    smartTransactionsLiveness,
  ) => {
    const effectiveChainId = transactionChainId || globalChainId;
    const addrIshardwareAccount = selectedAddress
      ? isHardwareAccount(selectedAddress)
      : false;
    const isAllowedNetwork =
      getAllowedSmartTransactionsChainIds().includes(effectiveChainId);
    return Boolean(
      isAllowedNetwork &&
        getIsAllowedRpcUrlForSmartTransactions(providerConfigRpcUrl) &&
        !addrIshardwareAccount, // && TODO: Make sure the functions below use the right chainId..
      // smartTransactionsFeatureFlagEnabled &&
      // smartTransactionsLiveness,
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
