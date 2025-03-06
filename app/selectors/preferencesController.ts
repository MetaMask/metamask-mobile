import { PreferencesState } from '@metamask/preferences-controller';
import { RootState } from '../reducers';
import { selectEvmChainId } from './networkController';
import { createDeepEqualSelector } from './util';
import { Hex } from '@metamask/utils';

const selectPreferencesControllerState = (state: RootState) =>
  state.engine?.backgroundState?.PreferencesController;

export const selectIpfsGateway = createDeepEqualSelector(
  selectPreferencesControllerState,
  (preferencesControllerState: PreferencesState) =>
    preferencesControllerState.ipfsGateway,
);

export const selectUseNftDetection = createDeepEqualSelector(
  selectPreferencesControllerState,
  (preferencesControllerState: PreferencesState) =>
    preferencesControllerState.useNftDetection,
);

export const selectShowMultiRpcModal = createDeepEqualSelector(
  selectPreferencesControllerState,
  (preferencesControllerState: PreferencesState) =>
    preferencesControllerState.showMultiRpcModal,
);

export const selectUseTokenDetection = createDeepEqualSelector(
  selectPreferencesControllerState,
  (preferencesControllerState: PreferencesState) =>
    preferencesControllerState.useTokenDetection,
);

export const selectDisplayNftMedia = createDeepEqualSelector(
  selectPreferencesControllerState,
  (preferencesControllerState: PreferencesState) =>
    preferencesControllerState.displayNftMedia,
);

export const selectUseSafeChainsListValidation = createDeepEqualSelector(
  selectPreferencesControllerState,
  (preferencesControllerState: PreferencesState) =>
    preferencesControllerState.useSafeChainsListValidation,
);

export const selectTokenSortConfig = createDeepEqualSelector(
  selectPreferencesControllerState,
  (preferencesControllerState: PreferencesState) =>
    preferencesControllerState.tokenSortConfig,
);

export const selectTokenNetworkFilter = createDeepEqualSelector(
  selectPreferencesControllerState,
  (preferencesControllerState: PreferencesState) =>
    preferencesControllerState.tokenNetworkFilter,
);

export const selectIsTokenNetworkFilterEqualCurrentNetwork =
  createDeepEqualSelector(
    selectPreferencesControllerState,
    (state: RootState) => selectEvmChainId(state),
    (preferencesControllerState: PreferencesState, chainId: Hex) => {
      const tokenNetworkFilter =
        preferencesControllerState.tokenNetworkFilter || {};
      if (
        Object.keys(tokenNetworkFilter).length === 1 &&
        Object.keys(tokenNetworkFilter)[0] === chainId
      ) {
        return true;
      }
      return false;
    },
  );

// isMultiAccountBalancesEnabled is a patched property - ref patches/@metamask+preferences-controller+2.1.0.patch
export const selectIsMultiAccountBalancesEnabled = createDeepEqualSelector(
  selectPreferencesControllerState,
  (preferencesControllerState: PreferencesState) =>
    (
      preferencesControllerState as PreferencesState & {
        isMultiAccountBalancesEnabled: boolean;
      }
    ).isMultiAccountBalancesEnabled,
);

// showTestNetworks is a patched property - ref patches/@metamask+preferences-controller+2.1.0.patch
export const selectShowTestNetworks = createDeepEqualSelector(
  selectPreferencesControllerState,
  (preferencesControllerState: PreferencesState) =>
    (
      preferencesControllerState as PreferencesState & {
        showTestNetworks: boolean;
      }
    ).showTestNetworks,
);

export const selectShowIncomingTransactionNetworks = createDeepEqualSelector(
  selectPreferencesControllerState,
  (preferencesControllerState: PreferencesState) =>
    (
      preferencesControllerState as PreferencesState & {
        showIncomingTransactions: { [chainId: string]: boolean };
      }
    ).showIncomingTransactions,
);

export const selectIsIpfsGatewayEnabled = createDeepEqualSelector(
  selectPreferencesControllerState,
  (preferencesControllerState: PreferencesState) =>
    (
      preferencesControllerState as PreferencesState & {
        isIpfsGatewayEnabled: boolean;
      }
    ).isIpfsGatewayEnabled,
);

export const selectIsSecurityAlertsEnabled = createDeepEqualSelector(
  selectPreferencesControllerState,
  (preferencesControllerState: PreferencesState) =>
    (
      preferencesControllerState as PreferencesState & {
        securityAlertsEnabled: boolean;
      }
    ).securityAlertsEnabled,
);

export const selectSmartTransactionsOptInStatus = createDeepEqualSelector(
  selectPreferencesControllerState,
  (preferencesControllerState: PreferencesState) =>
    preferencesControllerState.smartTransactionsOptInStatus,
);

export const selectUseTransactionSimulations = createDeepEqualSelector(
  selectPreferencesControllerState,
  (preferencesControllerState: PreferencesState) =>
    (
      preferencesControllerState as PreferencesState & {
        useTransactionSimulations: boolean;
      }
    ).useTransactionSimulations,
);

export const selectPrivacyMode = createDeepEqualSelector(
  selectPreferencesControllerState,
  (preferencesControllerState: PreferencesState) =>
    preferencesControllerState.privacyMode,
);

export const selectSmartTransactionsMigrationApplied = createDeepEqualSelector(
  selectPreferencesControllerState,
  (preferencesControllerState: PreferencesState) =>
    preferencesControllerState.featureFlags
      ?.smartTransactionsMigrationApplied ?? false,
);

export const selectSmartTransactionsBannerDismissed = createDeepEqualSelector(
  selectPreferencesControllerState,
  (preferencesControllerState: PreferencesState) =>
    preferencesControllerState.featureFlags?.smartTransactionsBannerDismissed ??
    false,
);
