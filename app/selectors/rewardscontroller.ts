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
