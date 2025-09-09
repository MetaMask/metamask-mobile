import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../../reducers';
import { CaipAccountId } from '@metamask/utils';
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
    rewardsControllerState.activeAccount?.subscriptionId ?? null,
);

/**
 * A memoized selector that returns the rewards active account id
 */
export const selectRewardsActiveAccountId = createSelector(
  selectRewardsControllerState,
  (rewardsControllerState): CaipAccountId | null =>
    rewardsControllerState.activeAccount?.account ?? null,
);

export const selectRewardsActiveAccountHasOptedIn = createSelector(
  selectRewardsControllerState,
  (rewardsControllerState): boolean | null =>
    rewardsControllerState.activeAccount?.hasOptedIn ?? null,
);
