import { getEvmAccountFromSelectedAccountGroup } from '../../utils/accountUtils';
import { formatAccountToCaipAccountId } from '../../utils/rewardsUtils';
import Logger from '../../../../../util/Logger';
import { DevLogger } from '../../../../../core/SDKConnect/utils/DevLogger';
import { ensureError } from '../../../../../util/errorUtils';
import type { RewardsController } from '../../../../../core/Engine/controllers/rewards-controller/RewardsController';
import type { NetworkController } from '@metamask/network-controller';
import type { PerpsControllerMessenger } from '../PerpsController';

/**
 * RewardsIntegrationService
 *
 * Handles rewards-related operations and fee discount calculations.
 * Stateless service that coordinates with RewardsController and NetworkController.
 */
export class RewardsIntegrationService {
  /**
   * Error context helper for consistent logging
   */
  private static getErrorContext(
    method: string,
    additionalContext?: Record<string, unknown>,
  ): Record<string, unknown> {
    return {
      controller: 'RewardsIntegrationService',
      method,
      ...additionalContext,
    };
  }

  /**
   * Calculate user fee discount from rewards
   * Returns discount in basis points (e.g., 6500 = 65% discount)
   */
  static async calculateUserFeeDiscount(options: {
    rewardsController: RewardsController;
    networkController: NetworkController;
    messenger: PerpsControllerMessenger;
  }): Promise<number | undefined> {
    const { rewardsController, networkController, messenger } = options;

    try {
      const evmAccount = getEvmAccountFromSelectedAccountGroup();

      if (!evmAccount) {
        DevLogger.log(
          'RewardsIntegrationService: No EVM account found for fee discount',
        );
        return undefined;
      }

      // Get the chain ID using proper NetworkController method
      const networkState = messenger.call('NetworkController:getState');
      const selectedNetworkClientId = networkState.selectedNetworkClientId;
      const networkClient = networkController.getNetworkClientById(
        selectedNetworkClientId,
      );
      const chainId = networkClient?.configuration?.chainId;

      if (!chainId) {
        Logger.error(
          new Error('Chain ID not found for fee discount calculation'),
          this.getErrorContext('calculateUserFeeDiscount', {
            selectedNetworkClientId,
            networkClientExists: !!networkClient,
          }),
        );
        return undefined;
      }

      const caipAccountId = formatAccountToCaipAccountId(
        evmAccount.address,
        chainId,
      );

      if (!caipAccountId) {
        Logger.error(
          new Error('Failed to format CAIP account ID for fee discount'),
          this.getErrorContext('calculateUserFeeDiscount', {
            address: evmAccount.address,
            chainId,
            selectedNetworkClientId,
          }),
        );
        return undefined;
      }

      const discountBips =
        await rewardsController.getPerpsDiscountForAccount(caipAccountId);

      DevLogger.log('RewardsIntegrationService: Fee discount calculated', {
        address: evmAccount.address,
        caipAccountId,
        discountBips,
        discountPercentage: discountBips / 100,
      });

      return discountBips;
    } catch (error) {
      Logger.error(
        ensureError(error),
        this.getErrorContext('calculateUserFeeDiscount'),
      );
      return undefined;
    }
  }
}
