import { useCallback, useRef, type RefObject } from 'react';
import { useNavigation } from '@react-navigation/native';
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
   * defers `pendingAction` until the sheet closes with a channel enabled.
   *
   * @param pendingAction - Ran on sheet close only if a channel becomes enabled.
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
 * `openSetupIfNeeded`; it only runs after the user enables a channel and closes
 * the sheet. Dismissing without enabling drops the action.
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
  // Read the freshest preferences at sheet-close time; the user may have just
  // toggled a channel while the sheet was open.
  const preferencesRef = useRef(preferences);
  preferencesRef.current = preferences;

  const openSetupIfNeeded = useCallback(
    (pendingAction?: PendingAction): boolean => {
      if (isLoadingPreferences) {
        return false;
      }

      if (!hasNotificationPreferences) {
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
    const pendingAction = pendingActionRef.current;
    pendingActionRef.current = null;
    if (
      pendingAction &&
      areTradingSignalsChannelsEnabled(preferencesRef.current)
    ) {
      pendingAction();
    }
  }, []);

  return { openSetupIfNeeded, onSetupDismiss };
};

export default useOpenTradingSignalsSetup;
