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
  lastUpdated: { persist: true, anonymous: false },
};

/**
 * Get the default state for the RewardsController
 */
export const getRewardsControllerDefaultState = (): RewardsControllerState => ({
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
   * Reset controller state to default
   */
  resetState(): void {
    this.update(() => getRewardsControllerDefaultState());
  }

  /**
   * Update last updated timestamp
   */
  updateLastUpdated(): void {
    this.update((state) => {
      state.lastUpdated = Date.now();
    });
  }
}
