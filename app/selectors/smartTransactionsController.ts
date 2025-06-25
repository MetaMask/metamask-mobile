import { selectSmartTransactionsOptInStatus } from './preferencesController';
import { RootState } from '../reducers';
import { swapsSmartTxFlagEnabled } from '../reducers/swaps';
import { areAddressesEqual, isHardwareAccount } from '../util/address';
import { selectEvmChainId, selectRpcUrlByChainId } from './networkController';
import {
  SmartTransaction,
  SmartTransactionStatuses,
} from '@metamask/smart-transactions-controller/dist/types';
import { selectSelectedInternalAccountFormattedAddress } from './accountsController';
import { getAllowedSmartTransactionsChainIds } from '../../app/constants/smartTransactions';
import { createDeepEqualSelector } from './util';
import { Hex } from '@metamask/utils';
import { getIsAllowedRpcUrlForSmartTransactions } from '../util/smart-transactions';

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
    const addressIsHardwareAccount = selectedAddress
      ? isHardwareAccount(selectedAddress)
      : false;
    const isAllowedNetwork =
      getAllowedSmartTransactionsChainIds().includes(effectiveChainId);
    return Boolean(
      isAllowedNetwork &&
        !addressIsHardwareAccount &&
        getIsAllowedRpcUrlForSmartTransactions(providerConfigRpcUrl) &&
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
          selectedAddress &&
          areAddressesEqual(txParams?.from, selectedAddress) &&
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
