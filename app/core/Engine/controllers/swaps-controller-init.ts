import { ControllerInitFunction } from '../types';
import SwapsController, {
  type SwapsControllerMessenger,
} from '@metamask/swaps-controller';
import AppConstants from '../../AppConstants';
import { swapsSupportedChainIds } from '../constants';
import { fetchEstimatedMultiLayerL1Fee } from '../../../util/networks/engineNetworkUtils';

/**
 * Initialize the swaps controller.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @returns The initialized controller.
 */
export const swapsControllerInit: ControllerInitFunction<
  SwapsController,
  SwapsControllerMessenger
> = ({ controllerMessenger, getController }) => {
  const gasFeeController = getController('GasFeeController');

  const controller = new SwapsController({
    messenger: controllerMessenger,
    clientId: AppConstants.SWAPS.CLIENT_ID,
    fetchAggregatorMetadataThreshold:
      AppConstants.SWAPS.CACHE_AGGREGATOR_METADATA_THRESHOLD,
    fetchTokensThreshold: AppConstants.SWAPS.CACHE_TOKENS_THRESHOLD,
    fetchTopAssetsThreshold: AppConstants.SWAPS.CACHE_TOP_ASSETS_THRESHOLD,
    supportedChainIds: swapsSupportedChainIds,
    pollCountLimit: AppConstants.SWAPS.POLL_COUNT_LIMIT,
    fetchGasFeeEstimates: () => gasFeeController.fetchGasFeeEstimates(),
    fetchEstimatedMultiLayerL1Fee,
  });

  return {
    controller,
  };
};
