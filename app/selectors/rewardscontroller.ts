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
 * Selector for the subscription from RewardsControllerState
 */
export const selectRewardsSubscription = createSelector(
  [selectRewardsControllerStateWithFeatureFlag],
  (rewardsControllerState: RewardsControllerState | null) =>
    rewardsControllerState?.subscription,
);
