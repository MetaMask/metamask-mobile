import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../../reducers';
import {
  RecentDropCommit,
  RECENT_COMMIT_VALIDITY_WINDOW_MS,
} from '../../reducers/rewards';

/**
 *
 * @param state - Root redux state
 * @returns - AccountsController state
 */
export const selectRewardsControllerState = (state: RootState) =>
  state.engine.backgroundState.RewardsController;

export const selectRewardsActiveAccountSubscriptionId = createSelector(
  selectRewardsControllerState,
  (rewardsControllerState): string | null =>
    rewardsControllerState.activeAccount?.subscriptionId ?? null,
);

/**
 * A memoized selector that returns the rewards subscription id,
 * falling back to candidateSubscriptionId if not 'pending' or 'error'
 */
export const selectRewardsSubscriptionId = createSelector(
  [
    selectRewardsControllerState,
    (state: RootState) => state.rewards.candidateSubscriptionId,
  ],
  (rewardsControllerState, candidateSubscriptionId): string | null => {
    const subscriptionId =
      rewardsControllerState.activeAccount?.subscriptionId ?? null;
    if (subscriptionId) {
      return subscriptionId;
    }
    if (
      candidateSubscriptionId &&
      candidateSubscriptionId !== 'pending' &&
      candidateSubscriptionId !== 'error' &&
      candidateSubscriptionId !== 'retry'
    ) {
      return candidateSubscriptionId;
    }
    return null;
  },
);

export const selectRewardsActiveAccountAddress = createSelector(
  selectRewardsControllerState,
  (rewardsControllerState): string | null => {
    const account = rewardsControllerState.activeAccount?.account;
    if (!account) return null;
    const parts = account.split(':');
    return parts[parts.length - 1];
  },
);

/**
 * Selector to get all recent drop commits
 */
export const selectRecentDropCommits = (state: RootState) =>
  state.rewards.recentDropCommits;

/**
 * Factory selector to get a recent drop commit by drop ID.
 * Returns the commit only if it's still within the validity window.
 * @param dropId - The drop ID to get the recent commit for
 */
export const selectRecentDropCommitByDropId = (dropId: string) =>
  createSelector(
    selectRecentDropCommits,
    (recentDropCommits): RecentDropCommit | null => {
      const commit = recentDropCommits[dropId];
      if (!commit) {
        return null;
      }

      // Check if the commit is still within the validity window
      const now = Date.now();
      if (now - commit.committedAt >= RECENT_COMMIT_VALIDITY_WINDOW_MS) {
        return null;
      }

      return commit;
    },
  );
