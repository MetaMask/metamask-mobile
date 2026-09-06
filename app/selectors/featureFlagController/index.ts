import { createSelector } from 'reselect';
import { StateWithPartialEngine } from './types';

const shouldApplyBalanceBreakdownDevOverrides =
  __DEV__ && process.env.NODE_ENV !== 'test';

// Temporary local-development overrides for visually validating TMCU-1317.
// Keep these out of API-mocking fixtures so simulator builds receive them too.
const BALANCE_BREAKDOWN_DEV_OVERRIDES = {
  assetsDefiPositionsEnabled: true,
  defiControllerV2: { enabled: false },
  homeTMCU1103AbtestActionButtonsGrid: 'control',
  homeTMCU1209AbtestHomepageBalanceBreakdown: 'iconsWithArrows',
  homeTMCU610AbtestWalletHomePostOnboardingSteps: 'control',
  homepageRedesignV1: { enabled: true, minimumVersion: '7.59' },
  homepageSectionsV1: { enabled: true, minimumVersion: '7.70.0' },
  moneyEnableMoneyAccount: { enabled: true, minimumVersion: '0.0.0' },
  perpsPerpTradingEnabled: { enabled: true, minimumVersion: '7.56.0' },
  predictTradingEnabled: { enabled: true, minimumVersion: '7.60.0' },
  walletHomeOnboardingSteps: { enabled: false, minimumVersion: '0.0.0' },
} as const;

// Access the controller state directly
export const selectRemoteFeatureFlagControllerState = (
  state: StateWithPartialEngine,
) => state.engine.backgroundState.RemoteFeatureFlagController;

const selectBasicFunctionalityEnabledForRemoteFlags = (
  state: StateWithPartialEngine,
): boolean => {
  if ('settings' in state && state.settings != null) {
    return Boolean(state.settings.basicFunctionalityEnabled);
  }
  return true;
};

export const selectRawFeatureFlags = createSelector(
  selectRemoteFeatureFlagControllerState,
  (remoteFeatureFlagControllerState) =>
    remoteFeatureFlagControllerState?.remoteFeatureFlags ?? {},
);

const selectRemoteFeatureFlagsMerged = createSelector(
  selectRemoteFeatureFlagControllerState,
  // `remoteFeatureFlags` already has `localOverrides` applied, so consumers
  // receive the effective flag values with no app-side merge needed.
  (remoteFeatureFlagControllerState) => {
    const remoteFeatureFlags =
      remoteFeatureFlagControllerState?.remoteFeatureFlags ?? {};

    return shouldApplyBalanceBreakdownDevOverrides
      ? { ...remoteFeatureFlags, ...BALANCE_BREAKDOWN_DEV_OVERRIDES }
      : remoteFeatureFlags;
  },
);

/**
 * Merged remote + local override flags, ignoring the basic functionality gate.
 * Use for dev override UI only.
 */
export const selectRemoteFeatureFlagsUnfiltered =
  selectRemoteFeatureFlagsMerged;

/**
 * Primary selector for remote feature flags.
 * Returns an empty object when basic functionality is disabled.
 */
export const selectRemoteFeatureFlags = createSelector(
  selectBasicFunctionalityEnabledForRemoteFlags,
  selectRemoteFeatureFlagsMerged,
  (isBasicFunctionalityEnabled, remoteFeatureFlags) => {
    if (!isBasicFunctionalityEnabled) {
      return {};
    }
    return remoteFeatureFlags;
  },
);

export const selectLocalOverrides = createSelector(
  selectRemoteFeatureFlagControllerState,
  (remoteFeatureFlagControllerState) =>
    remoteFeatureFlagControllerState?.localOverrides ?? {},
);

export const selectRawRemoteFeatureFlags = createSelector(
  selectRemoteFeatureFlagControllerState,
  (remoteFeatureFlagControllerState) =>
    remoteFeatureFlagControllerState?.rawRemoteFeatureFlags ?? {},
);

/**
 * Maps threshold feature flag names to their selected group name, which the
 * controller stores separately from the flag value for threshold and A/B flags.
 *
 * Respects the basic functionality gate (returns `{}` when disabled), mirroring
 * `selectRemoteFeatureFlags`, so A/B assignment stays off when the user has
 * turned basic functionality off.
 */
export const selectFeatureFlagThresholdGroups = createSelector(
  selectBasicFunctionalityEnabledForRemoteFlags,
  selectRemoteFeatureFlagControllerState,
  (isBasicFunctionalityEnabled, remoteFeatureFlagControllerState) => {
    if (!isBasicFunctionalityEnabled) {
      return {};
    }
    return remoteFeatureFlagControllerState?.featureFlagThresholdGroups ?? {};
  },
);
