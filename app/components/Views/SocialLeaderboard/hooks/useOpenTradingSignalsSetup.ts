import { useCallback, useEffect, useRef } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import Routes from '../../../../constants/navigation/Routes';
import { selectIsMetamaskNotificationsEnabled } from '../../../../selectors/notifications';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { useNotificationPreferences } from '../NotificationPreferences/hooks';
import {
  areTradingSignalsChannelsDisabled,
  areTradingSignalsChannelsEnabled,
} from '../NotificationPreferences/hooks/tradingSignalsChannels';
import { playErrorNotification } from '../../../../util/haptics';
import { createTradingSignalsSetupNavigationDetails } from '../components/TradingSignalsSetupBottomSheet';
import { navigateWithDetails } from '../../../../util/navigation/navUtils';

/** Action deferred until the setup sheet closes with channels enabled. */
type PendingAction = () => void | Promise<void>;

export interface UseOpenTradingSignalsSetupResult {
  /**
   * Intercepts an action that requires notifications. When the global master
   * toggle is off it presents the FeatureNotificationsGate sheet. When the
   * trading-signal channels are disabled it fires an error haptic and navigates
   * to the setup sheet, deferring `pendingAction` until the sheet closes with a
   * channel enabled. When the user has no saved preferences yet it routes to
   * notification settings and resumes the action on return.
   *
   * @param pendingAction - Deferred until setup completes with channels enabled.
   * @returns `true` when the action was intercepted (sheet or settings
   * navigation triggered) and the caller must not perform it inline.
   */
  openSetupIfNeeded: (pendingAction?: PendingAction) => boolean;
}

/**
 * Opens the FeatureNotificationsGate sheet when the global master toggle is
 * off, the Trading Signals setup bottom sheet when both channels are off, or
 * routes to notification settings when the user has no saved preferences yet.
 *
 * Rather than performing the action optimistically, the caller passes it to
 * `openSetupIfNeeded`. For the setup sheet the action is handed to the sheet
 * screen as a navigation param and runs when the sheet closes with at least one
 * trading-signal channel enabled. For the master-toggle and no-preferences
 * paths it runs after returning with notifications enabled. Dismissing a sheet
 * without enabling, or returning from settings without creating preferences,
 * drops the action.
 */
export const useOpenTradingSignalsSetup =
  (): UseOpenTradingSignalsSetupResult => {
    const navigation = useNavigation<AppNavigationProp>();
    const isMasterEnabled = useSelector(selectIsMetamaskNotificationsEnabled);
    const {
      preferences,
      hasNotificationPreferences,
      isLoading: isLoadingPreferences,
    } = useNotificationPreferences();

    const pendingActionRef = useRef<PendingAction | null>(null);
    const awaitingSettingsNavigationRef = useRef(false);
    const awaitingGateSheetRef = useRef(false);
    const wasBlurredRef = useRef(false);
    // Tracks whether this hook's screen is currently focused. The shared
    // notification-preferences cache can re-render this hook while the screen is
    // in the background (e.g. the user toggles a channel in the Settings flow),
    // and we must not resume the deferred action until the user returns.
    const isFocusedRef = useRef(false);
    // Read the freshest preferences / master toggle at resume time; the user
    // may have just enabled them in a sheet or the Settings flow.
    const preferencesRef = useRef(preferences);
    preferencesRef.current = preferences;
    const isMasterEnabledRef = useRef(isMasterEnabled);
    isMasterEnabledRef.current = isMasterEnabled;

    const clearPendingAction = useCallback(() => {
      pendingActionRef.current = null;
      awaitingSettingsNavigationRef.current = false;
      awaitingGateSheetRef.current = false;
    }, []);

    const navigateToSetupSheet = useCallback(
      (pendingAction?: PendingAction) => {
        playErrorNotification().catch(() => undefined);
        navigateWithDetails(
          navigation,
          createTradingSignalsSetupNavigationDetails({
            onSetupComplete: pendingAction,
          }),
        );
      },
      [navigation],
    );

    const navigateToGateSheet = useCallback(() => {
      navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.SHEET.FEATURE_NOTIFICATIONS_GATE,
        params: { feature: 'socialAI', autoDismiss: true },
      });
    }, [navigation]);

    const tryForwardPendingAction = useCallback((): boolean => {
      const pendingAction = pendingActionRef.current;
      if (
        !pendingAction ||
        !isMasterEnabledRef.current ||
        !areTradingSignalsChannelsEnabled(preferencesRef.current)
      ) {
        return false;
      }

      clearPendingAction();
      pendingAction();
      return true;
    }, [clearPendingAction]);

    const resumeFromSettingsNavigation = useCallback(() => {
      if (
        !awaitingSettingsNavigationRef.current ||
        !pendingActionRef.current ||
        isLoadingPreferences ||
        !hasNotificationPreferences
      ) {
        return;
      }

      awaitingSettingsNavigationRef.current = false;

      if (tryForwardPendingAction()) {
        return;
      }

      // Preferences now exist but no channel is enabled: open the setup sheet
      // and hand off the deferred action to it.
      const pendingAction = pendingActionRef.current ?? undefined;
      clearPendingAction();
      navigateToSetupSheet(pendingAction);
    }, [
      clearPendingAction,
      hasNotificationPreferences,
      isLoadingPreferences,
      navigateToSetupSheet,
      tryForwardPendingAction,
    ]);

    const resumeFromGateSheet = useCallback(() => {
      if (
        !awaitingGateSheetRef.current ||
        !pendingActionRef.current ||
        isLoadingPreferences
      ) {
        return;
      }

      if (!isMasterEnabled) {
        return;
      }

      awaitingGateSheetRef.current = false;

      if (tryForwardPendingAction()) {
        return;
      }

      // Master is on but no trading-signal channel is enabled: hand off to the
      // channel setup sheet.
      const pendingAction = pendingActionRef.current ?? undefined;
      clearPendingAction();
      navigateToSetupSheet(pendingAction);
    }, [
      clearPendingAction,
      isLoadingPreferences,
      isMasterEnabled,
      navigateToSetupSheet,
      tryForwardPendingAction,
    ]);

    const openSetupIfNeeded = useCallback(
      (pendingAction?: PendingAction): boolean => {
        if (isLoadingPreferences) {
          return false;
        }

        if (!isMasterEnabled) {
          pendingActionRef.current = pendingAction ?? null;
          awaitingGateSheetRef.current = true;
          navigateToGateSheet();
          return true;
        }

        if (!hasNotificationPreferences) {
          pendingActionRef.current = pendingAction ?? null;
          awaitingSettingsNavigationRef.current = true;
          navigation.navigate(Routes.SETTINGS_VIEW, {
            screen: Routes.SETTINGS.NOTIFICATIONS,
          });
          return true;
        }

        if (areTradingSignalsChannelsDisabled(preferences)) {
          navigateToSetupSheet(pendingAction);
          return true;
        }

        return false;
      },
      [
        hasNotificationPreferences,
        isLoadingPreferences,
        isMasterEnabled,
        navigateToGateSheet,
        navigateToSetupSheet,
        navigation,
        preferences,
      ],
    );

    useFocusEffect(
      useCallback(() => {
        isFocusedRef.current = true;

        if (
          wasBlurredRef.current &&
          awaitingSettingsNavigationRef.current &&
          pendingActionRef.current &&
          !isLoadingPreferences &&
          !hasNotificationPreferences
        ) {
          clearPendingAction();
          wasBlurredRef.current = false;
          return () => {
            isFocusedRef.current = false;
          };
        }

        if (
          wasBlurredRef.current &&
          awaitingGateSheetRef.current &&
          pendingActionRef.current &&
          !isLoadingPreferences &&
          !isMasterEnabled
        ) {
          clearPendingAction();
          wasBlurredRef.current = false;
          return () => {
            isFocusedRef.current = false;
          };
        }

        resumeFromGateSheet();
        resumeFromSettingsNavigation();

        return () => {
          isFocusedRef.current = false;
          wasBlurredRef.current = true;
        };
      }, [
        clearPendingAction,
        hasNotificationPreferences,
        isLoadingPreferences,
        isMasterEnabled,
        resumeFromGateSheet,
        resumeFromSettingsNavigation,
      ]),
    );

    // Covers the case where preferences resolve slightly after focus is
    // regained. Guarded on focus so shared-cache updates while the screen is
    // backgrounded never resume the deferred action before the user returns.
    useEffect(() => {
      if (!isFocusedRef.current) {
        return;
      }
      resumeFromGateSheet();
      resumeFromSettingsNavigation();
    }, [resumeFromGateSheet, resumeFromSettingsNavigation]);

    return { openSetupIfNeeded };
  };

export default useOpenTradingSignalsSetup;
