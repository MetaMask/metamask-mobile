import { BUILDER_FEE_CONFIG } from '../constants/hyperLiquidConfig';
import { PERPS_CONSTANTS } from '../constants/perpsConfig';
import type {
  HyperliquidBuilderFeeConfig,
  HyperliquidBuilderFees,
  PerpsPlatformDependencies,
} from '../types';
import type { PerpsControllerMessengerBase } from '../types/messenger';
import { getSelectedEvmAccount } from '../utils/accountUtils';
import { ensureError } from '../utils/errorUtils';
import { formatAccountToCaipAccountId } from '../utils/rewardsUtils';

/**
 * RewardsIntegrationService
 *
 * Handles rewards-related operations and VIP builder fee lookup.
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
   * Validate and parse HyperLiquid VIP builder fee data.
   *
   * @param fees - The raw VIP builder fee data from RewardsController.
   * @returns Parsed builder fee config, or undefined if invalid/unavailable.
   */
  #parseHyperliquidBuilderFeeConfig(
    fees: HyperliquidBuilderFees | null,
  ): HyperliquidBuilderFeeConfig | undefined {
    const builderFeeBips = Number(fees?.builderFeeBips);
    const maxFeeBips = BUILDER_FEE_CONFIG.MaxFeeTenthsBps / 10;

    if (
      !fees?.builderCode ||
      !Number.isFinite(builderFeeBips) ||
      builderFeeBips < 0 ||
      builderFeeBips > maxFeeBips
    ) {
      return undefined;
    }

    return {
      builderAddress: fees.builderCode,
      builderFeeBips,
    };
  }

  /**
   * Get user HyperLiquid builder fee config from rewards VIP fees.
   *
   * @returns The builder fee config, or undefined if unavailable.
   */
  async getUserHyperliquidBuilderFeeConfig(): Promise<
    HyperliquidBuilderFeeConfig | undefined
  > {
    try {
      const evmAccount = getSelectedEvmAccount(
        this.#messenger.call(
          'AccountTreeController:getAccountsFromSelectedAccountGroup',
        ),
      );

      if (!evmAccount) {
        this.#deps.debugLogger.log(
          'RewardsIntegrationService: No EVM account found for VIP builder fees',
        );
        return undefined;
      }

      // Get the chain ID via DI network controller
      const networkState = this.#messenger.call('NetworkController:getState');
      const { selectedNetworkClientId } = networkState;
      const chainId = this.#getChainIdForNetwork(selectedNetworkClientId);

      if (!chainId) {
        this.#deps.logger.error(
          new Error('Chain ID not found for VIP builder fees'),
          {
            tags: { feature: PERPS_CONSTANTS.FeatureName },
            context: {
              name: 'RewardsIntegrationService.getUserHyperliquidBuilderFeeConfig',
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
          new Error('Failed to format CAIP account ID for VIP builder fees'),
          {
            tags: { feature: PERPS_CONSTANTS.FeatureName },
            context: {
              name: 'RewardsIntegrationService.getUserHyperliquidBuilderFeeConfig',
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
      const fees =
        await this.#deps.rewards.getHyperliquidBuilderFeesForAccount(
          caipAccountId,
        );
      const builderFeeConfig = this.#parseHyperliquidBuilderFeeConfig(fees);

      this.#deps.debugLogger.log(
        'RewardsIntegrationService: VIP builder fee config resolved',
        {
          address: evmAccount.address,
          caipAccountId,
          builderAddress: builderFeeConfig?.builderAddress,
          builderFeeBips: builderFeeConfig?.builderFeeBips,
          hasVipBuilderFee: builderFeeConfig !== undefined,
        },
      );

      return builderFeeConfig;
    } catch (error) {
      this.#deps.logger.error(
        ensureError(
          error,
          'RewardsIntegrationService.getUserHyperliquidBuilderFeeConfig',
        ),
        {
          tags: { feature: PERPS_CONSTANTS.FeatureName },
          context: {
            name: 'RewardsIntegrationService.getUserHyperliquidBuilderFeeConfig',
            data: {},
          },
        },
      );
      return undefined;
    }
  }
}
