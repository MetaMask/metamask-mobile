import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../../reducers';

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
