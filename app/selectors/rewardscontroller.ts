import { createSelector } from 'reselect';
import type { RootState } from '../reducers';
import { RewardsControllerState } from '../core/Engine/controllers/rewards-controller/types';
import { selectRewardsEnabledFlag } from './featureFlagController/rewards';

/**
 * Raw state selector for RewardsController
 */
const selectRewardsControllerState = (state: RootState) =>
  state.engine?.backgroundState?.RewardsController;

/**
 * Feature flag aware selector base
 */
const selectRewardsControllerStateWithFeatureFlag = createSelector(
  [selectRewardsControllerState, selectRewardsEnabledFlag],
  (
    rewardsControllerState: RewardsControllerState,
    isRewardsEnabled: boolean,
  ) => {
    // Return null/undefined when feature flag is disabled
    if (!isRewardsEnabled) {
      return null;
    }
    return rewardsControllerState;
  },
);

/**
 * Selector to get the dev-only login address from RewardsController state
 */
export const selectDevOnlyLoginAddress = createSelector(
  selectRewardsControllerStateWithFeatureFlag,
  (rewardsControllerState: RewardsControllerState | null) =>
    rewardsControllerState?.devOnlyLoginAddress || null,
);

/**
 * Selector to get the last updated timestamp from RewardsController state
 */
export const selectRewardsLastUpdated = createSelector(
  selectRewardsControllerStateWithFeatureFlag,
  (rewardsControllerState: RewardsControllerState | null) =>
    rewardsControllerState?.lastUpdated || null,
);

/**
 * Selector to get the subscription ID for a given account address
 */
export const selectSubscriptionIdForAccount = createSelector(
  [
    selectRewardsControllerStateWithFeatureFlag,
    (_state: RootState, address: string) => address,
  ],
  (
    rewardsControllerState: RewardsControllerState | null,
    address: string,
  ): string | null => {
    if (!rewardsControllerState?.auth?.accountToSubscription) {
      return null;
    }
    return (
      rewardsControllerState.auth.accountToSubscription[
        address.toLowerCase()
      ] || null
    );
  },
);
