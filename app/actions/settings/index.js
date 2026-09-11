export function setSearchEngine(searchEngine) {
  return {
    type: 'SET_SEARCH_ENGINE',
    searchEngine,
  };
}

export function setShowHexData(showHexData) {
  return {
    type: 'SET_SHOW_HEX_DATA',
    showHexData,
  };
}

export function setShowFiatOnTestnets(showFiatOnTestnets) {
  return {
    type: 'SET_SHOW_FIAT_ON_TESTNETS',
    showFiatOnTestnets,
  };
}

export function setHideZeroBalanceTokens(hideZeroBalanceTokens) {
  return {
    type: 'SET_HIDE_ZERO_BALANCE_TOKENS',
    hideZeroBalanceTokens,
  };
}

export function setLockTime(lockTime) {
  return {
    type: 'SET_LOCK_TIME',
    lockTime,
  };
}

export function setPrimaryCurrency(primaryCurrency) {
  return {
    type: 'SET_PRIMARY_CURRENCY',
    primaryCurrency,
  };
}

export function setAvatarAccountType(avatarAccountType) {
  return {
    type: 'SET_AVATAR_ACCOUNT_TYPE',
    avatarAccountType,
  };
}

// Plain action creator for state updates (used during store initialization)
export function setBasicFunctionality(basicFunctionalityEnabled) {
  return {
    type: 'TOGGLE_BASIC_FUNCTIONALITY',
    basicFunctionalityEnabled,
  };
}

export function setBasicFunctionalityConsolidatedEnabled(
  isBasicFunctionalityConsolidatedEnabled,
) {
  return {
    type: 'SET_BASIC_FUNCTIONALITY_CONSOLIDATED_ENABLED',
    isBasicFunctionalityConsolidatedEnabled,
  };
}

export function setBasicFunctionalityMigrationNotification(
  basicFunctionalityMigrationNotification,
) {
  return {
    type: 'SET_BASIC_FUNCTIONALITY_MIGRATION_NOTIFICATION',
    basicFunctionalityMigrationNotification,
  };
}

export function dismissBasicFunctionalityMigrationNotification() {
  return {
    type: 'DISMISS_BASIC_FUNCTIONALITY_MIGRATION_NOTIFICATION',
  };
}

export function consolidateBasicFunctionality() {
  return async (dispatch, getState) => {
    const state = getState();
    const {
      selectMobileUxBftcConsolidationFlagEnabled,
      BFT_CHILD_PREFERENCES,
    } = require('../../selectors/featureFlagController/basicFunctionalityConsolidation');
    if (
      !selectMobileUxBftcConsolidationFlagEnabled(state) ||
      state.settings?.isBasicFunctionalityConsolidatedEnabled
    ) {
      return;
    }

    const {
      getBasicFunctionalityConsolidationPlan,
      isBasicFunctionalitySocialLoginUser,
    } = require('../../util/basicFunctionality/getBasicFunctionalityConsolidationPlan');
    const {
      syncConsolidatedBasicFunctionalityPreferences,
    } = require('../../util/basicFunctionality/syncConsolidatedBasicFunctionalityPreferences');
    const seedlessState =
      state.engine?.backgroundState?.SeedlessOnboardingController;
    const isSocialLogin = isBasicFunctionalitySocialLoginUser({
      accountType: state.onboarding?.accountType,
      authConnection: seedlessState?.authConnection,
      hasSeedlessVault: seedlessState?.vault != null,
    });
    const preferencesController =
      state.engine?.backgroundState?.PreferencesController ?? {};
    const preferenceState = {
      basicFunctionalityEnabled:
        state.settings?.basicFunctionalityEnabled === true,
    };
    BFT_CHILD_PREFERENCES.forEach((preference) => {
      preferenceState[preference] = preferencesController[preference] === true;
    });

    const { landingState, notification } =
      getBasicFunctionalityConsolidationPlan(preferenceState, isSocialLogin);

    syncConsolidatedBasicFunctionalityPreferences(landingState);
    dispatch(setBasicFunctionality(landingState));
    dispatch(setBasicFunctionalityConsolidatedEnabled(true));
    dispatch(
      setBasicFunctionalityMigrationNotification(
        state.settings?.basicFunctionalityMigrationNotificationDismissed
          ? null
          : notification,
      ),
    );

    const Engine = require('../../core/Engine').default;
    Engine.context.MultichainAccountService.setBasicFunctionality(
      landingState,
    ).catch((error) => {
      console.error(
        'Failed to set consolidated basic functionality on MultichainAccountService:',
        error,
      );
    });
  };
}

// Thunk action creator for user-initiated toggles (includes MultichainAccountService integration)
export function toggleBasicFunctionality(basicFunctionalityEnabled) {
  return async (dispatch, getState) => {
    const {
      selectIsBasicFunctionalityConsolidationEnabled,
    } = require('../../selectors/featureFlagController/basicFunctionalityConsolidation');
    const {
      syncConsolidatedBasicFunctionalityPreferences,
    } = require('../../util/basicFunctionality/syncConsolidatedBasicFunctionalityPreferences');

    // Evaluate consolidation eligibility before flipping BF. Silent-migration
    // users are eligible via consistent all-on/all-off state; flipping BF first
    // would make children look mixed and skip sync.
    const shouldSyncConsolidatedPreferences =
      selectIsBasicFunctionalityConsolidationEnabled(getState());

    // Persist cohort membership before flipping BF so the UI does not briefly
    // re-show granular toggles while children are still mixed.
    if (shouldSyncConsolidatedPreferences) {
      dispatch(setBasicFunctionalityConsolidatedEnabled(true));
    }

    dispatch(setBasicFunctionality(basicFunctionalityEnabled));

    if (shouldSyncConsolidatedPreferences) {
      syncConsolidatedBasicFunctionalityPreferences(basicFunctionalityEnabled);
    }

    const Engine = require('../../core/Engine').default;
    Engine.context.MultichainAccountService.setBasicFunctionality(
      basicFunctionalityEnabled,
    ).catch((error) => {
      console.error(
        'Failed to set basic functionality on MultichainAccountService:',
        error,
      );
    });
  };
}

export function toggleDeviceNotification(deviceNotificationEnabled) {
  return {
    type: 'TOGGLE_DEVICE_NOTIFICATIONS',
    deviceNotificationEnabled,
  };
}

export function setTokenSortConfig(tokenSortConfig) {
  return {
    type: 'SET_TOKEN_SORT_CONFIG',
    tokenSortConfig,
  };
}

export function setDeepLinkModalDisabled(deepLinkModalDisabled) {
  return {
    type: 'SET_DEEP_LINK_MODAL_DISABLED',
    deepLinkModalDisabled,
  };
}

export function setHapticsEnabled(hapticsEnabled) {
  return {
    type: 'SET_HAPTICS_ENABLED',
    hapticsEnabled,
  };
}

export function setPerpsChartPreferredCandlePeriod(preferredCandlePeriod) {
  return {
    type: 'SET_PERPS_CHART_PREFERRED_CANDLE_PERIOD',
    preferredCandlePeriod,
  };
}

export function setPerpsMarketListPreferences(preferences) {
  return {
    type: 'SET_PERPS_MARKET_LIST_PREFERENCES',
    preferences,
  };
}

export function setShowAccountOnLeaderboard(showAccountOnLeaderboard) {
  return {
    type: 'SET_SHOW_ACCOUNT_ON_LEADERBOARD',
    showAccountOnLeaderboard,
  };
}
