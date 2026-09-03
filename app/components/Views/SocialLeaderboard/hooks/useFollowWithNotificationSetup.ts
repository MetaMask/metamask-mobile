import { useCallback } from 'react';
import { useOpenTradingSignalsSetup } from './useOpenTradingSignalsSetup';

/** The follow write to perform, deferred when notification setup is needed. */
type PerformFollow = () => void | Promise<void>;

export interface UseFollowWithNotificationSetupResult {
  /**
   * Runs `performFollow`, first routing through notification setup when the
   * action is a *follow* (not an unfollow) and the trading-signal channels are
   * off. In that case the write is deferred to the setup sheet and this
   * resolves without following — the sheet performs it once a channel is
   * enabled.
   *
   * @param isFollowing - Whether the trader is currently followed. Unfollowing
   * never prompts for notification setup.
   * @param performFollow - The toggle-follow write, including its analytics
   * context. Kept caller-side because each surface reports a different
   * `source` and has a different way of resolving the trader.
   */
  followWithSetup: (
    isFollowing: boolean,
    performFollow: PerformFollow,
  ) => Promise<void>;
}

/**
 * Gates a follow behind trading-signal notification setup.
 *
 * Following a trader is only useful if their alerts can actually arrive, so the
 * first follow prompts the user to enable a notification channel. Unfollowing
 * is never gated.
 *
 * Shared by the leaderboard, the trader profile, and the home carousel, which
 * all wrap their own `toggleFollow` call in this same gate.
 */
export const useFollowWithNotificationSetup =
  (): UseFollowWithNotificationSetupResult => {
    const { openSetupIfNeeded } = useOpenTradingSignalsSetup();

    const followWithSetup = useCallback(
      async (isFollowing: boolean, performFollow: PerformFollow) => {
        if (!isFollowing && openSetupIfNeeded(performFollow)) {
          return;
        }
        await performFollow();
      },
      [openSetupIfNeeded],
    );

    return { followWithSetup };
  };

export default useFollowWithNotificationSetup;
