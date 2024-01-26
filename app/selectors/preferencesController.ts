import { createSelector } from 'reselect';
import { PreferencesState } from '@metamask/preferences-controller';
import { RootState } from '../reducers';
import { isHardwareAccount } from '../../app/util/address';
import { selectChainId } from './networkController';
import { NETWORKS_CHAIN_ID } from 'app/constants/network';

const selectPreferencesControllerState = (state: RootState) =>
  state.engine.backgroundState.PreferencesController;

export const selectIdentities = createSelector(
  selectPreferencesControllerState,
  (preferencesControllerState: PreferencesState) =>
    preferencesControllerState.identities,
);

export const selectIpfsGateway = createSelector(
  selectPreferencesControllerState,
  (preferencesControllerState: PreferencesState) =>
    preferencesControllerState.ipfsGateway,
);

export const selectSelectedAddress = createSelector(
  selectPreferencesControllerState,
  (preferencesControllerState: PreferencesState) =>
    preferencesControllerState.selectedAddress,
);

export const selectUseNftDetection = createSelector(
  selectPreferencesControllerState,
  (preferencesControllerState: PreferencesState) =>
    preferencesControllerState.useNftDetection,
);

export const selectUseTokenDetection = createSelector(
  selectPreferencesControllerState,
  (preferencesControllerState: PreferencesState) =>
    preferencesControllerState.useTokenDetection,
);

export const selectDisplayNftMedia = createSelector(
  selectPreferencesControllerState,
  (preferencesControllerState: PreferencesState) =>
    preferencesControllerState.displayNftMedia,
);

export const selectUseSafeChainsListValidation = createSelector(
  selectPreferencesControllerState,
  (preferencesControllerState: PreferencesState) =>
    preferencesControllerState.useSafeChainsListValidation,
);

export const selectDisabledRpcMethodPreferences = createSelector(
  selectPreferencesControllerState,
  (preferencesControllerState: PreferencesState) =>
    preferencesControllerState.disabledRpcMethodPreferences,
);

// isMultiAccountBalancesEnabled is a patched property - ref patches/@metamask+preferences-controller+2.1.0.patch
export const selectIsMultiAccountBalancesEnabled = createSelector(
  selectPreferencesControllerState,
  (preferencesControllerState: PreferencesState) =>
    (
      preferencesControllerState as PreferencesState & {
        isMultiAccountBalancesEnabled: boolean;
      }
    ).isMultiAccountBalancesEnabled,
);

// showTestNetworks is a patched property - ref patches/@metamask+preferences-controller+2.1.0.patch
export const selectShowTestNetworks = createSelector(
  selectPreferencesControllerState,
  (preferencesControllerState: PreferencesState) =>
    (
      preferencesControllerState as PreferencesState & {
        showTestNetworks: boolean;
      }
    ).showTestNetworks,
);

export const selectShowIncomingTransactionNetworks = createSelector(
  selectPreferencesControllerState,
  (preferencesControllerState: PreferencesState) =>
    (
      preferencesControllerState as PreferencesState & {
        showIncomingTransactions: { [chainId: string]: boolean };
      }
    ).showIncomingTransactions,
);

export const selectIsIpfsGatewayEnabled = createSelector(
  selectPreferencesControllerState,
  (preferencesControllerState: PreferencesState) =>
    (
      preferencesControllerState as PreferencesState & {
        isIpfsGatewayEnabled: boolean;
      }
    ).isIpfsGatewayEnabled,
);

export const selectIsSecurityAlertsEnabled = createSelector(
  selectPreferencesControllerState,
  (preferencesControllerState: PreferencesState) =>
    (
      preferencesControllerState as PreferencesState & {
        securityAlertsEnabled: boolean;
      }
    ).securityAlertsEnabled,
);

export const selectSmartTransactionsOptInStatus = createSelector(
  selectPreferencesControllerState,
  (preferencesControllerState: PreferencesState) =>
    preferencesControllerState.smartTransactionsOptInStatus,
);

// TODO put this somewhere better
export const ALLOWED_SMART_TRANSACTIONS_CHAIN_IDS = [
  NETWORKS_CHAIN_ID.MAINNET,
  NETWORKS_CHAIN_ID.GOERLI,
];

// TODO optimize using createSelector
export const getSmartTransactionsEnabled = (state: RootState) => {
  const selectedAddress = selectSelectedAddress(state);
  const addrIshardwareAccount = isHardwareAccount(selectedAddress);
  const chainId = selectChainId(state);

  const isAllowedNetwork =
    ALLOWED_SMART_TRANSACTIONS_CHAIN_IDS.includes(chainId);

  return Boolean(isAllowedNetwork && !addrIshardwareAccount);
};

// TODO optimize using createSelector
export const getIsSmartTransaction = (state: RootState) => {
  const isSmartTransactionsEnabled = getSmartTransactionsEnabled(state);
  const smartTransactionsOptInStatus =
    selectSmartTransactionsOptInStatus(state);

  return isSmartTransactionsEnabled && smartTransactionsOptInStatus;
};
