import { useCallback, useEffect, useRef, type RefObject } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Routes from '../../../../constants/navigation/Routes';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { useNotificationPreferences } from '../NotificationPreferences/hooks';
import {
  areTradingSignalsChannelsDisabled,
  areTradingSignalsChannelsEnabled,
} from '../NotificationPreferences/hooks/tradingSignalsChannels';
import { playErrorNotification } from '../../../../util/haptics';
import type { TradingSignalsSetupBottomSheetRef } from '../components/TradingSignalsSetupBottomSheet';

/** Action deferred until the setup sheet closes with channels enabled. */
type PendingAction = () => void | Promise<void>;

export interface UseOpenTradingSignalsSetupResult {
  /**
   * Intercepts an action that requires notifications. When the trading-signal
   * channels are disabled it fires an error haptic, opens the setup sheet, and
   * defers `pendingAction` until setup completes. For the bottom sheet that
   * means a channel is enabled before close; for the no-preferences path it
   * means returning from notification settings with channels enabled.
   *
   * @param pendingAction - Deferred until setup completes with channels enabled.
   * @returns `true` when the action was intercepted (sheet opened or settings
   * navigation triggered) and the caller must not perform it inline.
   */
  openSetupIfNeeded: (pendingAction?: PendingAction) => boolean;
  /** Wire into the setup sheet's `onDismiss` to forward or drop the action. */
  onSetupDismiss: () => void;
}

/**
 * Opens the Trading Signals setup bottom sheet when both channels are off, or
 * routes to notification settings when the user has no saved preferences yet.
 *
 * Rather than performing the action optimistically, the caller passes it to
 * `openSetupIfNeeded`; it only runs after setup completes with at least one
 * trading-signal channel enabled. Dismissing the sheet without enabling, or
 * returning from settings without creating preferences, drops the action.
 */
export const useOpenTradingSignalsSetup = (
  sheetRef: RefObject<TradingSignalsSetupBottomSheetRef | null>,
): UseOpenTradingSignalsSetupResult => {
  const navigation = useNavigation();
  const {
    preferences,
    hasNotificationPreferences,
    isLoading: isLoadingPreferences,
  } = useNotificationPreferences();

  const pendingActionRef = useRef<PendingAction | null>(null);
  const awaitingSettingsNavigationRef = useRef(false);
  const wasBlurredRef = useRef(false);
  // Tracks whether this hook's screen is currently focused. The shared
  // notification-preferences cache can re-render this hook while the screen is
  // in the background (e.g. the user toggles a channel in the Settings flow),
  // and we must not resume the deferred action until the user returns.
  const isFocusedRef = useRef(false);
  // Read the freshest preferences at sheet-close time; the user may have just
  // toggled a channel while the sheet was open.
  const preferencesRef = useRef(preferences);
  preferencesRef.current = preferences;

  const clearPendingAction = useCallback(() => {
    pendingActionRef.current = null;
    awaitingSettingsNavigationRef.current = false;
  }, []);

  const tryForwardPendingAction = useCallback((): boolean => {
    const pendingAction = pendingActionRef.current;
    if (
      !pendingAction ||
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

    playErrorNotification().catch(() => undefined);
    sheetRef.current?.onOpenBottomSheet();
  }, [
    hasNotificationPreferences,
    isLoadingPreferences,
    sheetRef,
    tryForwardPendingAction,
  ]);

  const openSetupIfNeeded = useCallback(
    (pendingAction?: PendingAction): boolean => {
      if (isLoadingPreferences) {
        return false;
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
        pendingActionRef.current = pendingAction ?? null;
        playErrorNotification().catch(() => undefined);
        sheetRef.current?.onOpenBottomSheet();
        return true;
      }

      return false;
    },
    [
      hasNotificationPreferences,
      isLoadingPreferences,
      navigation,
      preferences,
      sheetRef,
    ],
  );

  const onSetupDismiss = useCallback(() => {
    tryForwardPendingAction();
  }, [tryForwardPendingAction]);

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

      resumeFromSettingsNavigation();

      return () => {
        isFocusedRef.current = false;
        wasBlurredRef.current = true;
      };
    }, [
      clearPendingAction,
      hasNotificationPreferences,
      isLoadingPreferences,
      resumeFromSettingsNavigation,
    ]),
  );

  // Covers the case where preferences resolve slightly after focus is regained.
  // Guarded on focus so shared-cache updates while the screen is backgrounded
  // never resume the deferred action before the user returns.
  useEffect(() => {
    if (!isFocusedRef.current) {
      return;
    }
    resumeFromSettingsNavigation();
  }, [resumeFromSettingsNavigation]);

  return { openSetupIfNeeded, onSetupDismiss };
};

export default useOpenTradingSignalsSetup;
