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
      selectShouldRepairSocialLoginBasicFunctionality,
      BFT_CHILD_PREFERENCES,
    } = require('../../selectors/featureFlagController/basicFunctionalityConsolidation');
    const shouldRepairSocialLogin =
      selectShouldRepairSocialLoginBasicFunctionality(state);
    if (
      !selectMobileUxBftcConsolidationFlagEnabled(state) &&
      !shouldRepairSocialLogin
    ) {
      return;
    }

    // Social-login wallets must stay on for the whole rollout, so a persisted
    // cohort member whose Basic Functionality is off is migrated again to put
    // it back on. Every other consolidated wallet is already done.
    const isConsolidated =
      state.settings?.isBasicFunctionalityConsolidatedEnabled === true;
    if (isConsolidated && state.settings?.basicFunctionalityEnabled === true) {
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

    // An off SRP wallet that already migrated chose that state deliberately.
    if (isConsolidated && !isSocialLogin) {
      return;
    }

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

    // Aligned wallets already match the landing state across BF and every
    // child preference, so nothing is rewritten. Analytics only covers the
    // unaligned mixed / unaligned social upgrades that actually change state.
    const isAligned =
      preferenceState.basicFunctionalityEnabled === landingState &&
      BFT_CHILD_PREFERENCES.every(
        (preference) => preferenceState[preference] === landingState,
      );

    syncConsolidatedBasicFunctionalityPreferences(landingState);
    // Persist cohort membership before flipping BF so mixed/social wallets that
    // land ON keep the build-flag rollout instead of briefly reading LD as off.
    dispatch(setBasicFunctionalityConsolidatedEnabled(true));
    dispatch(setBasicFunctionality(landingState));
    dispatch(
      setBasicFunctionalityMigrationNotification(
        state.settings?.basicFunctionalityMigrationNotificationDismissed
          ? null
          : notification,
      ),
    );

    // Landing ON aligns every wallet through the snap providers, which is slow
    // and network-dependent. Awaiting it would hold the notice back for the
    // rest of the session, and a rejection would drop the whole migration with
    // no retry, so run it as best effort like the user-initiated toggle does.
    const Engine = require('../../core/Engine').default;
    Engine.context.MultichainAccountService.setBasicFunctionality(
      landingState,
    ).catch((error) => {
      console.error(
        'Failed to set basic functionality on MultichainAccountService while consolidating:',
        error,
      );
    });

    // A social repair re-runs an already-reported migration, so it does not
    // emit the event a second time.
    if (!isConsolidated && !isAligned) {
      const { analytics } = require('../../util/analytics/analytics');
      const {
        AnalyticsEventBuilder,
      } = require('../../util/analytics/AnalyticsEventBuilder');
      const { MetaMetricsEvents } = require('../../core/Analytics');
      analytics.trackEvent(
        AnalyticsEventBuilder.createEventBuilder(
          MetaMetricsEvents.BASIC_FUNCTIONALITY_MIGRATED,
        )
          .addProperties({
            routed_bf_state: landingState ? 'on' : 'off',
            is_social_login: isSocialLogin,
          })
          .build(),
      );
    }
  };
}

// Thunk action creator for user-initiated toggles (includes MultichainAccountService integration)
export function toggleBasicFunctionality(basicFunctionalityEnabled) {
  return async (dispatch, getState) => {
    const {
      selectIsInBasicFunctionalityConsolidationRollout,
      selectIsSocialLoginBasicFunctionalityLocked,
    } = require('../../selectors/featureFlagController/basicFunctionalityConsolidation');
    const {
      syncConsolidatedBasicFunctionalityPreferences,
    } = require('../../util/basicFunctionality/syncConsolidatedBasicFunctionalityPreferences');

    const state = getState();

    // The UI disables this toggle for social-login wallets, but enforce the
    // invariant in the action as well so non-UI callers cannot turn it off.
    if (
      !basicFunctionalityEnabled &&
      selectIsSocialLoginBasicFunctionalityLocked(state)
    ) {
      return;
    }

    // Evaluate the rollout before flipping BF. A mixed legacy wallet may invoke
    // this through Backup & Sync before its background migration completes; in
    // that case the persisted cohort marker is still false, but the user action
    // must still update BF and every consolidated child as one logical change.
    // An enrolled wallet keeps syncing children even once the enrollment flag
    // reads false, since Settings still presents Basic Functionality as the
    // single control for them.
    const shouldSyncConsolidatedPreferences =
      selectIsInBasicFunctionalityConsolidationRollout(state);

    const Engine = require('../../core/Engine').default;
    const { UserStorageController } = Engine.context;
    const isBackupAndSyncEnabled =
      state.engine?.backgroundState?.UserStorageController
        ?.isBackupAndSyncEnabled === true;
    if (
      !basicFunctionalityEnabled &&
      isBackupAndSyncEnabled &&
      UserStorageController
    ) {
      const {
        BACKUPANDSYNC_FEATURES,
      } = require('@metamask/profile-sync-controller/user-storage');
      // Backup & Sync depends on BF, so clear its master toggle here instead of
      // waiting for the Backup & Sync screen to mount. Turning BF off is a
      // privacy action and must still succeed if this fails; that screen's own
      // effect retries the cleanup.
      try {
        await UserStorageController.setIsBackupAndSyncFeatureEnabled(
          BACKUPANDSYNC_FEATURES.main,
          false,
        );
      } catch (error) {
        console.error(
          'Failed to disable Backup & Sync while turning off basic functionality:',
          error,
        );
      }
    }

    // Persist cohort membership before flipping BF so the UI does not briefly
    // re-show granular toggles while children are still mixed.
    if (shouldSyncConsolidatedPreferences) {
      dispatch(setBasicFunctionalityConsolidatedEnabled(true));
    }

    dispatch(setBasicFunctionality(basicFunctionalityEnabled));

    if (shouldSyncConsolidatedPreferences) {
      syncConsolidatedBasicFunctionalityPreferences(basicFunctionalityEnabled);
    }

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
