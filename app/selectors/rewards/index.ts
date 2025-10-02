import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../../reducers';

/**
 *
 * @param state - Root redux state
 * @returns - AccountsController state
 */
export const selectRewardsControllerState = (state: RootState) =>
  state.engine.backgroundState.RewardsController;

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
      candidateSubscriptionId !== 'error'
    ) {
      return candidateSubscriptionId;
    }
    return null;
  },
);

export const selectRewardsActiveAccountHasOptedIn = createSelector(
  selectRewardsControllerState,
  (rewardsControllerState): boolean | null =>
    rewardsControllerState.activeAccount?.hasOptedIn ?? null,
);

export const selectHideUnlinkedAccountsBanner = (state: RootState): boolean =>
  state.rewards.hideUnlinkedAccountsBanner;
