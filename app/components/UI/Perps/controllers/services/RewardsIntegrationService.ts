import { ensureError } from '../../../../../util/errorUtils';
import { formatAccountToCaipAccountId } from '../../utils/rewardsUtils';
import type { PerpsControllerMessenger } from '../PerpsController';
import type { PerpsPlatformDependencies } from '../types';

/**
 * RewardsIntegrationService
 *
 * Handles rewards-related operations and fee discount calculations.
 * Stateless service that coordinates with RewardsController and NetworkController.
 *
 * Instance-based service with constructor injection of platform dependencies
 * and messenger for inter-controller communication.
 */
export class RewardsIntegrationService {
  private readonly deps: PerpsPlatformDependencies;
  private readonly messenger: PerpsControllerMessenger;

  /**
   * Create a new RewardsIntegrationService instance
   * @param deps - Platform dependencies for logging, metrics, etc.
   * @param messenger - Messenger for inter-controller communication
   */
  constructor(
    deps: PerpsPlatformDependencies,
    messenger: PerpsControllerMessenger,
  ) {
    this.deps = deps;
    this.messenger = messenger;
  }

  /**
   * Get selected EVM account via messenger
   */
  private getSelectedEvmAccount(): { address: string } | undefined {
    const account = this.messenger.call(
      'AccountsController:getSelectedAccount',
    );
    // Filter for EVM accounts (eip155:eoa or eip155:erc4337)
    if (account?.type === 'eip155:eoa' || account?.type === 'eip155:erc4337') {
      return { address: account.address };
    }
    return undefined;
  }

  /**
   * Get chain ID for a network client via messenger
   */
  private getChainIdForNetwork(networkClientId: string): string | undefined {
    try {
      const networkClient = this.messenger.call(
        'NetworkController:getNetworkClientById',
        networkClientId,
      );
      return networkClient.configuration.chainId;
    } catch {
      // Network client may not exist
      return undefined;
    }
  }

  /**
   * Calculate user fee discount from rewards
   * Returns discount in basis points (e.g., 6500 = 65% discount)
   */
  async calculateUserFeeDiscount(): Promise<number | undefined> {
    try {
      const evmAccount = this.getSelectedEvmAccount();

      if (!evmAccount) {
        this.deps.debugLogger.log(
          'RewardsIntegrationService: No EVM account found for fee discount',
        );
        return undefined;
      }

      // Get the chain ID using messenger
      const networkState = this.messenger.call('NetworkController:getState');
      const selectedNetworkClientId = networkState.selectedNetworkClientId;
      const chainId = this.getChainIdForNetwork(selectedNetworkClientId);

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

      // Use pure utility function for CAIP formatting
      const caipAccountId = formatAccountToCaipAccountId(
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

      // Use rewards from deps (stays as DI - no messenger action in core)
      const discountBips = await this.deps.rewards.getFeeDiscount(
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
