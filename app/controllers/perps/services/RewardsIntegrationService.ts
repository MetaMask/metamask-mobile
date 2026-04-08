import { PERPS_CONSTANTS } from '../constants/perpsConfig';
import type { PerpsPlatformDependencies } from '../types';
import type { PerpsControllerMessengerBase } from '../types/messenger';
import { getSelectedEvmAccount } from '../utils/accountUtils';
import { ensureError } from '../utils/errorUtils';
import { formatAccountToCaipAccountId } from '../utils/rewardsUtils';

/**
 * RewardsIntegrationService
 *
 * Handles rewards-related operations and fee discount calculations.
 * Stateless service that coordinates with RewardsController and NetworkController.
 *
 * Instance-based service with constructor injection of platform dependencies.
 */
export class RewardsIntegrationService {
  readonly #deps: PerpsPlatformDependencies;

  readonly #messenger: PerpsControllerMessengerBase;

  /**
   * Create a new RewardsIntegrationService instance
   *
   * @param deps - Platform dependencies for logging, metrics, etc.
   * @param messenger - Controller messenger for cross-controller communication.
   */
  constructor(
    deps: PerpsPlatformDependencies,
    messenger: PerpsControllerMessengerBase,
  ) {
    this.#deps = deps;
    this.#messenger = messenger;
  }

  /**
   * Get chain ID for a network client via DI network controller
   *
   * @param networkClientId - The network client identifier to look up.
   * @returns The chain ID string, or undefined if the network client is not found.
   */
  #getChainIdForNetwork(networkClientId: string): string | undefined {
    try {
      const networkClient = this.#messenger.call(
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
   *
   * @returns The fee discount in basis points, or undefined if unavailable.
   */
  async calculateUserFeeDiscount(): Promise<number | undefined> {
    try {
      const evmAccount = getSelectedEvmAccount(
        this.#messenger.call(
          'AccountTreeController:getAccountsFromSelectedAccountGroup',
        ),
      );

      if (!evmAccount) {
        this.#deps.debugLogger.log(
          'RewardsIntegrationService: No EVM account found for fee discount',
        );
        return undefined;
      }

      // Get the chain ID via DI network controller
      const networkState = this.#messenger.call('NetworkController:getState');
      const { selectedNetworkClientId } = networkState;
      const chainId = this.#getChainIdForNetwork(selectedNetworkClientId);

      if (!chainId) {
        this.#deps.logger.error(
          new Error('Chain ID not found for fee discount calculation'),
          {
            tags: { feature: PERPS_CONSTANTS.FeatureName },
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

      // Use pure utility function for CAIP formatting (pass logger for error reporting)
      const caipAccountId = formatAccountToCaipAccountId(
        evmAccount.address,
        chainId,
        this.#deps.logger,
      );

      if (!caipAccountId) {
        this.#deps.logger.error(
          new Error('Failed to format CAIP account ID for fee discount'),
          {
            tags: { feature: PERPS_CONSTANTS.FeatureName },
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

      // Use rewards via DI (no RewardsController in Core yet)
      const discountBips =
        await this.#deps.rewards.getPerpsDiscountForAccount(caipAccountId);

      this.#deps.debugLogger.log(
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
      this.#deps.logger.error(
        ensureError(
          error,
          'RewardsIntegrationService.calculateUserFeeDiscount',
        ),
        {
          tags: { feature: PERPS_CONSTANTS.FeatureName },
          context: {
            name: 'RewardsIntegrationService.calculateUserFeeDiscount',
            data: {},
          },
        },
      );
      return undefined;
    }
  }
}
