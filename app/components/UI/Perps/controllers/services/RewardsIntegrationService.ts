import { ensureError } from '../../../../../util/errorUtils';
import type { PerpsControllerMessenger } from '../PerpsController';
import type {
  PerpsPlatformDependencies,
  PerpsControllerAccess,
} from '../types';

/**
 * RewardsIntegrationService
 *
 * Handles rewards-related operations and fee discount calculations.
 * Stateless service that coordinates with RewardsController and NetworkController.
 *
 * Instance-based service with constructor injection of platform dependencies.
 */
export class RewardsIntegrationService {
  private readonly deps: PerpsPlatformDependencies;

  /**
   * Create a new RewardsIntegrationService instance
   * @param deps - Platform dependencies for logging, metrics, etc.
   */
  constructor(deps: PerpsPlatformDependencies) {
    this.deps = deps;
  }

  /**
   * Calculate user fee discount from rewards
   * Returns discount in basis points (e.g., 6500 = 65% discount)
   *
   * @param options.controllers - Consolidated controller access interface
   * @param options.messenger - Controller messenger for network state access
   */
  async calculateUserFeeDiscount(options: {
    controllers: PerpsControllerAccess;
    messenger: PerpsControllerMessenger;
  }): Promise<number | undefined> {
    const { controllers, messenger } = options;

    try {
      const evmAccount = controllers.accounts.getSelectedEvmAccount();

      if (!evmAccount) {
        this.deps.debugLogger.log(
          'RewardsIntegrationService: No EVM account found for fee discount',
        );
        return undefined;
      }

      // Get the chain ID using controllers.network
      const networkState = messenger.call('NetworkController:getState');
      const selectedNetworkClientId = networkState.selectedNetworkClientId;
      let chainId: string | undefined;

      try {
        chainId = controllers.network.getChainIdForNetwork(
          selectedNetworkClientId,
        );
      } catch {
        // Network client may not exist
        chainId = undefined;
      }

      if (!chainId) {
        this.deps.logger.error(
          new Error('Chain ID not found for fee discount calculation'),
          {
            context: {
              name: 'RewardsIntegrationService.calculateUserFeeDiscount',
              data: {
                selectedNetworkClientId,
              },
            },
          },
        );
        return undefined;
      }

      const caipAccountId = controllers.accounts.formatAccountToCaipId(
        evmAccount.address,
        chainId,
      );

      if (!caipAccountId) {
        this.deps.logger.error(
          new Error('Failed to format CAIP account ID for fee discount'),
          {
            context: {
              name: 'RewardsIntegrationService.calculateUserFeeDiscount',
              data: {
                address: evmAccount.address,
                chainId,
                selectedNetworkClientId,
              },
            },
          },
        );
        return undefined;
      }

      const discountBips = await controllers.rewards.getFeeDiscount(
        caipAccountId as `${string}:${string}:${string}`,
      );

      this.deps.debugLogger.log(
        'RewardsIntegrationService: Fee discount calculated',
        {
          address: evmAccount.address,
          caipAccountId,
          discountBips,
          discountPercentage: discountBips / 100,
        },
      );

      return discountBips;
    } catch (error) {
      this.deps.logger.error(ensureError(error), {
        context: {
          name: 'RewardsIntegrationService.calculateUserFeeDiscount',
          data: {},
        },
      });
      return undefined;
    }
  }
}
