import { useCallback } from 'react';
import { useOpenTradingSignalsSetup } from './useOpenTradingSignalsSetup';
import { useSocialTermsGate } from '../terms/useSocialTermsGate';

/** The follow or unfollow write. A follow runs before notification setup. */
type PerformFollow = () => void | Promise<void>;

export interface UseFollowWithNotificationSetupOptions {
  requireSocialTerms?: boolean;
}

export interface UseFollowWithNotificationSetupResult {
  /**
   * Runs `performFollow` immediately. When the action is a *follow* (not an
   * unfollow) and trading-signal notifications are off, notification setup
   * opens after the follow request settles. The follow is not handed to the
   * sheet: `performFollow` is a toggle, so running it again after a successful
   * follow would unfollow the trader.
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
 * Prompts for trading-signal notifications after a follow.
 *
 * Following no longer waits on the notification sheet. The follow request runs
 * first, then setup opens when a channel is still off. Unfollowing never
 * prompts. A rejected follow skips setup.
 *
 * Shared by the leaderboard, the trader profile, and the home carousel, which
 * all wrap their own `toggleFollow` call in this same prompt.
 */
export const useFollowWithNotificationSetup = ({
  requireSocialTerms = false,
}: UseFollowWithNotificationSetupOptions = {}): UseFollowWithNotificationSetupResult => {
  const { openSetupIfNeeded } = useOpenTradingSignalsSetup();
  const { ensureSocialTermsAccepted } = useSocialTermsGate();

  const followWithSetup = useCallback(
    async (isFollowing: boolean, performFollow: PerformFollow) => {
      if (requireSocialTerms && !ensureSocialTermsAccepted()) {
        return;
      }
      await performFollow();
      // Setup has no deferred follow. Passing `performFollow` would toggle
      // again once a channel is enabled and unfollow the trader.
      if (!isFollowing) {
        openSetupIfNeeded();
      }
    },
    [ensureSocialTermsAccepted, openSetupIfNeeded, requireSocialTerms],
  );

  return { followWithSetup };
};

export default useFollowWithNotificationSetup;
