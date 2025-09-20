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
 * A memoized selector that returns the rewards subscription id
 */
export const selectRewardsSubscriptionId = createSelector(
  selectRewardsControllerState,
  (rewardsControllerState): string | null =>
    rewardsControllerState.lastAuthenticatedAccount?.subscriptionId ?? null,
);
