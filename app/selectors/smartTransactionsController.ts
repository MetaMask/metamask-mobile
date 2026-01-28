import { Alert } from 'react-native';
import { selectSmartTransactionsOptInStatus } from './preferencesController';
import { RootState } from '../reducers';
import { areAddressesEqual, isHardwareAccount } from '../util/address';
import { selectEvmChainId, selectRpcUrlByChainId } from './networkController';
import {
  SmartTransaction,
  SmartTransactionsNetworkConfig,
  SmartTransactionStatuses,
  SmartTransactionsFeatureFlagsState,
  selectSmartTransactionsFeatureFlagsForChain,
} from '@metamask/smart-transactions-controller';
import { selectRemoteFeatureFlags } from './featureFlagController';
import { selectSelectedInternalAccountFormattedAddress } from './accountsController';
import { selectSelectedAccountGroupInternalAccounts } from './multichainAccounts/accountTreeController';
import { getAllowedSmartTransactionsChainIds } from '../../app/constants/smartTransactions';
import { createDeepEqualSelector } from './util';
import { CaipChainId, Hex } from '@metamask/utils';
import { getIsAllowedRpcUrlForSmartTransactions } from '../util/smart-transactions';
import { getFeatureFlagDeviceKey } from '../reducers/swaps/utils';

/**
 * Stable wrapper for controller's feature flags state shape.
 */
const selectSmartTransactionsFeatureFlagsState = createDeepEqualSelector(
  (state: RootState) =>
    selectRemoteFeatureFlags(state).smartTransactionsNetworks,
  (smartTransactionsNetworks): SmartTransactionsFeatureFlagsState => ({
    remoteFeatureFlags: { smartTransactionsNetworks },
  }),
);

/**
 * @param state - The Redux state.
 * @param chainId - The chain ID (hex or CAIP-2 format).
 * @returns The validated and merged feature flags for the chain.
 */
export const getSmartTransactionsFeatureFlagsForChain = createDeepEqualSelector(
  selectSmartTransactionsFeatureFlagsState,
  (_state, chainId: Hex | CaipChainId) => chainId,
  (featureFlagsState, chainId): SmartTransactionsNetworkConfig =>
    selectSmartTransactionsFeatureFlagsForChain(featureFlagsState, chainId),
);

/**
 * Checks if smart transactions are enabled for the current device based on feature flags.
 * Uses device-specific flags (mobileActiveIOS, mobileActiveAndroid) with fallback to mobileActive.
 */
export const isSmartTransactionEnabledWithNetworkFeatureFlag = (
  featureFlags: SmartTransactionsNetworkConfig,
) => {
  const featureFlagDeviceKey = getFeatureFlagDeviceKey(); // returns mobileActive, mobileActiveIOS or mobileActiveAndroid
  return featureFlags[featureFlagDeviceKey] ?? false;
};

export const selectSmartTransactionsEnabled = createDeepEqualSelector(
  [
    selectSelectedInternalAccountFormattedAddress,
    selectEvmChainId,
    (_state: RootState, chainId?: Hex) => chainId,
    (state: RootState, chainId?: Hex) =>
      selectRpcUrlByChainId(state, chainId || selectEvmChainId(state)),
    (state: RootState, chainId?: Hex) => {
      const effectiveChainId = chainId || selectEvmChainId(state);
      return getSmartTransactionsFeatureFlagsForChain(state, effectiveChainId);
    },
    (state: RootState) =>
      state.engine.backgroundState.SmartTransactionsController
        .smartTransactionsState?.livenessByChainId,
  ],
  (
    selectedAddress,
    globalChainId,
    transactionChainId,
    providerConfigRpcUrl,
    smartTransactionsFeatureFlags,
    smartTransactionsLivenessByChainId,
  ) => {
    const effectiveChainId = transactionChainId || globalChainId;
    const addressIsHardwareAccount = selectedAddress
      ? isHardwareAccount(selectedAddress)
      : false;
    const isAllowedNetwork =
      getAllowedSmartTransactionsChainIds().includes(effectiveChainId);

    const isSmartTransactionEnabledOnNetworkWithFeatureFlags =
      isSmartTransactionEnabledWithNetworkFeatureFlag(
        smartTransactionsFeatureFlags,
      );
    const isAllowedRpcUrl =
      getIsAllowedRpcUrlForSmartTransactions(providerConfigRpcUrl);
    const liveness = smartTransactionsLivenessByChainId?.[effectiveChainId];
    Alert.alert(
      'Debug Values',
      `isAllowedNetwork: ${isAllowedNetwork}\naddressIsHardwareAccount: ${addressIsHardwareAccount}\nisSmartTransactionEnabledOnNetworkWithFeatureFlags: ${isSmartTransactionEnabledOnNetworkWithFeatureFlags}\nisAllowedRpcUrl: ${isAllowedRpcUrl}\nliveness: ${liveness}`,
    );
    return Boolean(
      isAllowedNetwork &&
        !addressIsHardwareAccount &&
        getIsAllowedRpcUrlForSmartTransactions(providerConfigRpcUrl) &&
        isSmartTransactionEnabledOnNetworkWithFeatureFlags &&
        smartTransactionsLivenessByChainId?.[effectiveChainId],
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

// porting the old `selectPendingSmartTransactionsBySender` to work with account groups
export const selectPendingSmartTransactionsForSelectedAccountGroup =
  createDeepEqualSelector(
    [
      selectSelectedAccountGroupInternalAccounts,
      selectEvmChainId,
      (state: RootState) =>
        state.engine.backgroundState.SmartTransactionsController
          ?.smartTransactionsState?.smartTransactions || {},
    ],
    (
      selectedGroupAccounts,
      chainId,
      smartTransactionsByChainId,
    ): SmartTransaction[] => {
      if (!selectedGroupAccounts || selectedGroupAccounts.length === 0) {
        return [];
      }

      const groupAddresses = selectedGroupAccounts
        .map((account) => account.address)
        .filter(Boolean) as string[];

      const smartTransactions: SmartTransaction[] =
        smartTransactionsByChainId[chainId] || [];

      return smartTransactions
        .filter((stx) => {
          const { txParams } = stx;
          const fromAddress = txParams?.from;
          if (!fromAddress) {
            return false;
          }

          const isFromSelectedGroup = groupAddresses.some((address) =>
            areAddressesEqual(fromAddress, address),
          );

          return (
            isFromSelectedGroup &&
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
