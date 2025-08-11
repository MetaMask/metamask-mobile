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
  devOnlyLoginAddress: { persist: true, anonymous: false },
  lastUpdated: { persist: true, anonymous: false },
};

/**
 * Get the default state for the RewardsController
 */
export const getRewardsControllerDefaultState = (): RewardsControllerState => ({
  devOnlyLoginAddress: null,
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

  /**
   * Set the dev-only login address
   */
  setDevOnlyLoginAddress(address: string | null): void {
    this.update((state) => {
      state.devOnlyLoginAddress = address;
    });
  }

  /**
   * Get the dev-only login address
   */
  getDevOnlyLoginAddress(): string | null {
    return this.state.devOnlyLoginAddress;
  }
}
