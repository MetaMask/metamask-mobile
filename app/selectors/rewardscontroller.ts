import { createSelector } from 'reselect';
import type { RootState } from '../reducers';
import { RewardsControllerState } from '../core/Engine/controllers/rewards-controller/types';

/**
 * Raw state selector for RewardsController
 */
const selectRewardsControllerState = (state: RootState) =>
  state.engine?.backgroundState?.RewardsController;

/**
 * Selector to get the dev-only login address from RewardsController state
 */
export const selectDevOnlyLoginAddress = createSelector(
  selectRewardsControllerState,
  (rewardsControllerState: RewardsControllerState) =>
    rewardsControllerState?.devOnlyLoginAddress,
);

/**
 * Selector to get the last updated timestamp from RewardsController state
 */
export const selectRewardsLastUpdated = createSelector(
  selectRewardsControllerState,
  (rewardsControllerState: RewardsControllerState) =>
    rewardsControllerState?.lastUpdated,
);

/**
 * Selector to get the subscription ID for a given account address
 */
export const selectSubscriptionIdForAccount = createSelector(
  [
    selectRewardsControllerState,
    (_state: RootState, address: string) => address,
  ],
  (
    rewardsControllerState: RewardsControllerState,
    address: string,
  ): string | null => {
    if (!rewardsControllerState?.silentAuth?.accountToSubscription) {
      return null;
    }
    return (
      rewardsControllerState.silentAuth.accountToSubscription[
        address.toLowerCase()
      ] || null
    );
  },
);
