import { useCallback } from 'react';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { useNotificationPreferences } from '../NotificationPreferences/hooks';
import {
  areTradingSignalsChannelsDisabled,
  areTradingSignalsChannelsEnabled,
} from '../NotificationPreferences/hooks/tradingSignalsChannels';

export interface UseTraderMuteResult {
  /** True when the trader is followed but their alerts are paused. */
  isMuted: boolean;
  /**
   * True when muting is actionable: the user has notification preferences and
   * push notifications are enabled.
   */
  isMuteAvailable: boolean;
  /**
   * True when the inline bell can render for a followed trader. Requires saved
   * notification preferences; push may still be off (tap then opens setup).
   */
  showMuteChip: boolean;
  /** True when both channels are off but preferences exist — follow/unmute should prompt setup. */
  needsNotificationSetup: boolean;
  /**
   * Visual mute state for the bell chip: muted when the trader is paused or
   * when both trading-signal channels are disabled globally.
   */
  isChipMuted: boolean;
  /** Optimistically flips the muted state for this trader. */
  toggleMute: () => void;
}

/**
 * Bridges the shared notification preferences to the per-trader "mute" concept
 * surfaced by the inline bell chip on the profile and leaderboard.
 *
 * "Muted" maps to the trader's `profileId` being present in
 * `socialAI.mutedTraderProfileIds`. The underlying hook already serves an
 * optimistic overlay and rolls back on failed writes, so the chip flips
 * instantly and self-heals.
 *
 * @param traderId - The trader's Clicker profile ID.
 * @returns Muted state, availability, and a toggle.
 */
export const useTraderMute = (traderId: string): UseTraderMuteResult => {
  const {
    preferences,
    hasNotificationPreferences,
    isTraderNotificationEnabled,
    toggleTraderNotification,
  } = useNotificationPreferences();

  const isMuteAvailable =
    hasNotificationPreferences && areTradingSignalsChannelsEnabled(preferences);
  const showMuteChip = hasNotificationPreferences;
  const needsNotificationSetup =
    hasNotificationPreferences &&
    areTradingSignalsChannelsDisabled(preferences);

  const toggleMute = useCallback(() => {
    toggleTraderNotification(traderId);
  }, [toggleTraderNotification, traderId]);

  const isMuted = !isTraderNotificationEnabled(traderId);

  return {
    isMuted,
    isMuteAvailable,
    showMuteChip,
    needsNotificationSetup,
    isChipMuted: isMuted || needsNotificationSetup,
    toggleMute,
  };
};

export default useTraderMute;
