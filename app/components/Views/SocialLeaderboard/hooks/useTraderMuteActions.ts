import { useCallback } from 'react';
import { ImpactMoment, playImpact } from '../../../../util/haptics';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { useNotificationPreferences } from '../NotificationPreferences/hooks';
import { areTradingSignalsChannelsDisabled } from '../NotificationPreferences/hooks/tradingSignalsChannels';
import { useOpenTradingSignalsSetup } from './useOpenTradingSignalsSetup';

export interface UseTraderMuteActionsResult {
  /**
   * True when the inline bell can render for a followed trader. Requires saved
   * notification preferences; the channels may still be off (a tap then opens
   * setup rather than muting).
   */
  showMuteChip: boolean;
  /**
   * Visual mute state for a trader's bell: muted when that trader's alerts are
   * paused, OR when both trading-signal channels are disabled globally (in
   * which case no trader can be heard).
   */
  isChipMuted: (traderId: string) => boolean;
  /**
   * Bell tap handler. When both channels are off the bell only *looks* disabled,
   * so a tap means "enable": setup is opened and an idempotent unmute is
   * deferred to it rather than a blind toggle, so completing setup can never
   * leave the trader muted. Otherwise it toggles directly.
   */
  onMutePress: (traderId: string) => void;
}

/**
 * Per-trader mute state and the bell-tap action.
 *
 * "Muted" maps to the trader's `profileId` being present in
 * `socialAI.mutedTraderProfileIds`. The underlying hook serves an optimistic
 * overlay and rolls back on failed writes, so the chip flips instantly and
 * self-heals.
 *
 * Keyed by `traderId` per call rather than per hook instance so the leaderboard
 * list can drive many rows from one instance; the trader profile passes its
 * single id.
 */
export const useTraderMuteActions = (): UseTraderMuteActionsResult => {
  const {
    preferences,
    hasNotificationPreferences,
    isTraderNotificationEnabled,
    toggleTraderNotification,
  } = useNotificationPreferences();
  const { openSetupIfNeeded } = useOpenTradingSignalsSetup();

  const needsNotificationSetup =
    hasNotificationPreferences &&
    areTradingSignalsChannelsDisabled(preferences);

  const isChipMuted = useCallback(
    (traderId: string) =>
      !isTraderNotificationEnabled(traderId) || needsNotificationSetup,
    [isTraderNotificationEnabled, needsNotificationSetup],
  );

  const onMutePress = useCallback(
    (traderId: string) => {
      const ensureUnmuted = () => {
        if (!isTraderNotificationEnabled(traderId)) {
          // Symmetric with the Follow button: same Light impact on any real toggle.
          playImpact(ImpactMoment.FollowToggle);
          toggleTraderNotification(traderId);
        }
      };
      if (openSetupIfNeeded(ensureUnmuted)) {
        return;
      }
      playImpact(ImpactMoment.FollowToggle);
      toggleTraderNotification(traderId);
    },
    [openSetupIfNeeded, isTraderNotificationEnabled, toggleTraderNotification],
  );

  return {
    showMuteChip: hasNotificationPreferences,
    isChipMuted,
    onMutePress,
  };
};

export default useTraderMuteActions;
