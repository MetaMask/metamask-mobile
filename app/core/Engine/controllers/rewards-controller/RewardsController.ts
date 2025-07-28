import { BaseController } from '@metamask/base-controller';
import type { RewardsControllerState } from './types';

import type { RewardsControllerMessenger } from '../../messengers/rewards-controller-messenger';

// Re-export the messenger type for convenience
export type { RewardsControllerMessenger };

const controllerName = 'RewardsController';

/**
 * State metadata for the RewardsController
 */
const metadata = {
  isAuthenticated: { persist: true, anonymous: false },
  subscriptionId: { persist: true, anonymous: false },
  currentSeasonId: { persist: true, anonymous: false },
  seasonBalance: { persist: true, anonymous: false },
  currentTierId: { persist: true, anonymous: false },
  isLoading: { persist: false, anonymous: false },
  error: { persist: false, anonymous: false },
  lastUpdated: { persist: true, anonymous: false },
};

/**
 * Get the default state for the RewardsController
 */
export const getRewardsControllerDefaultState = (): RewardsControllerState => ({
  // Auth state
  isAuthenticated: false,

  // Subscription state
  subscriptionId: null,

  // Season state
  currentSeasonId: null,
  seasonBalance: 0,
  currentTierId: null,

  // UI state
  isLoading: false,
  error: null,
  lastUpdated: null,
});

export const defaultRewardsControllerState = getRewardsControllerDefaultState();

/**
 * Controller for managing user rewards and campaigns
 * Handles reward claiming, campaign fetching, and reward history
 */
export class RewardsController extends BaseController<
  typeof controllerName,
  RewardsControllerState,
  RewardsControllerMessenger
> {
  constructor({
    messenger,
    state,
  }: {
    messenger: RewardsControllerMessenger;
    state?: Partial<RewardsControllerState>;
  }) {
    super({
      name: controllerName,
      metadata,
      messenger,
      state: {
        ...defaultRewardsControllerState,
        ...state,
      },
    });
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this.update((state) => {
      state.error = null;
    });
  }

  /**
   * Reset controller state to default
   */
  resetState(): void {
    this.update(() => getRewardsControllerDefaultState());
  }
}
