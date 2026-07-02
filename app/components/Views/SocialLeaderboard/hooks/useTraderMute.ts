import { useCallback } from 'react';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { useNotificationPreferences } from '../NotificationPreferences/hooks';

export interface UseTraderMuteResult {
  /** True when the trader is followed but their alerts are paused. */
  isMuted: boolean;
  /**
   * True when muting is actionable: the user has notification preferences and
   * push notifications are enabled. When false, there is nothing to mute yet,
   * so the inline chip should stay hidden and setup is handled elsewhere.
   */
  isMuteAvailable: boolean;
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
    hasNotificationPreferences && preferences.pushNotificationsEnabled;

  const toggleMute = useCallback(() => {
    toggleTraderNotification(traderId);
  }, [toggleTraderNotification, traderId]);

  return {
    isMuted: !isTraderNotificationEnabled(traderId),
    isMuteAvailable,
    toggleMute,
  };
};

export default useTraderMute;
