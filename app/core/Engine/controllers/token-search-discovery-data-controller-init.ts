import { ControllerInitFunction } from '../types';
import {
  TokenSearchDiscoveryDataController,
  type TokenSearchDiscoveryDataControllerMessenger,
} from '@metamask/assets-controllers';
import AppConstants from '../../AppConstants';
import { swapsSupportedChainIds } from '../constants';
import { swapsUtils } from '@metamask/swaps-controller';

/**
 * Initialize the token search discovery data controller.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @returns The initialized controller.
 */
export const tokenSearchDiscoveryDataControllerInit: ControllerInitFunction<
  TokenSearchDiscoveryDataController,
  TokenSearchDiscoveryDataControllerMessenger
> = ({ controllerMessenger, codefiTokenApiV2 }) => {
  const controller = new TokenSearchDiscoveryDataController({
    messenger: controllerMessenger,
    tokenPricesService: codefiTokenApiV2,
    fetchSwapsTokensThresholdMs: AppConstants.SWAPS.CACHE_TOKENS_THRESHOLD,
    fetchTokens: swapsUtils.fetchTokens,
    swapsSupportedChainIds,
  });

  return {
    controller,
  };
};
