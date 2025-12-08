import { createSelector } from 'reselect';
import { PreferencesState } from '@metamask/preferences-controller';
import { RootState } from '../reducers';
import { selectEvmChainId } from './networkController';
import { createDeepEqualSelector } from './util';
import { Hex } from '@metamask/utils';

const selectPreferencesControllerState = (state: RootState) =>
  state.engine?.backgroundState?.PreferencesController;

export const selectIpfsGateway = createSelector(
  selectPreferencesControllerState,
  (preferencesControllerState: PreferencesState) =>
    preferencesControllerState.ipfsGateway,
);

export const selectUseNftDetection = createSelector(
  selectPreferencesControllerState,
  (preferencesControllerState: PreferencesState) =>
    preferencesControllerState.useNftDetection,
);

export const selectShowMultiRpcModal = createSelector(
  selectPreferencesControllerState,
  (preferencesControllerState: PreferencesState) =>
    preferencesControllerState.showMultiRpcModal,
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

export const selectTokenSortConfig = createSelector(
  selectPreferencesControllerState,
  (preferencesControllerState: PreferencesState) =>
    preferencesControllerState.tokenSortConfig,
);

export const selectTokenNetworkFilter = createSelector(
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

/**
 * Selects the smart transactions opt-in status from preferences.
 *
 * Note: The unused `_chainId` parameter is required for type compatibility when this selector
 * is composed with other selectors (like `selectSmartTransactionsEnabled`) that accept an optional
 * `chainId`. Without it, `createDeepEqualSelector` infers the composed selector's type as only
 * accepting `state`, causing TypeScript errors when passing `chainId` to the composed selector.
 */
export const selectSmartTransactionsOptInStatus = createSelector(
  [
    selectPreferencesControllerState,
    (_state: RootState, _chainId?: Hex) => undefined,
  ],
  (preferencesControllerState) =>
    preferencesControllerState.smartTransactionsOptInStatus,
);

export const selectUseTransactionSimulations = createSelector(
  selectPreferencesControllerState,
  (preferencesControllerState: PreferencesState) =>
    (
      preferencesControllerState as PreferencesState & {
        useTransactionSimulations: boolean;
      }
    ).useTransactionSimulations,
);

export const selectPrivacyMode = createSelector(
  selectPreferencesControllerState,
  (preferencesControllerState: PreferencesState) =>
    preferencesControllerState.privacyMode,
);

export const selectSmartTransactionsMigrationApplied = createSelector(
  selectPreferencesControllerState,
  (preferencesControllerState: PreferencesState) =>
    preferencesControllerState.featureFlags
      ?.smartTransactionsMigrationApplied ?? false,
);

export const selectSmartTransactionsBannerDismissed = createSelector(
  selectPreferencesControllerState,
  (preferencesControllerState: PreferencesState) =>
    preferencesControllerState.featureFlags?.smartTransactionsBannerDismissed ??
    false,
);

export const selectDismissSmartAccountSuggestionEnabled = createSelector(
  selectPreferencesControllerState,
  (preferencesControllerState: PreferencesState) =>
    preferencesControllerState.dismissSmartAccountSuggestionEnabled ?? false,
);

export const selectSmartAccountOptIn = createSelector(
  selectPreferencesControllerState,
  (preferencesControllerState: PreferencesState) =>
    preferencesControllerState.smartAccountOptIn ?? false,
);
