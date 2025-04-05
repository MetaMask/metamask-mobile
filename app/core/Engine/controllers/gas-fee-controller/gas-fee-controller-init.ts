import { GasFeeController } from '@metamask/gas-fee-controller';
import { swapsUtils } from '@metamask/swaps-controller';

import type {
  ControllerInitFunction,
  ControllerInitRequest,
} from '../../types';
import AppConstants from '../../../AppConstants';
import Logger from '../../../../util/Logger';
import { addHexPrefix } from '../../../../util/number';
import { isMainnetByChainId } from '../../../../util/networks';
import { type GasFeeControllerMessenger } from '../../messengers/gas-fee-controller-messenger/gas-fee-controller-messenger';

const LEGACY_GAS_API_ENDPOINT =
  'https://gas.api.cx.metamask.io/networks/<chain_id>/gasPrices';
const EIP1559_API_ENDPOINT =
  'https://gas.api.cx.metamask.io/networks/<chain_id>/suggestedGasFees';

export const GasFeeControllerInit: ControllerInitFunction<
  GasFeeController,
  GasFeeControllerMessenger
> = (request) => {
  const { controllerMessenger, getGlobalChainId } = request;

  const { networkController } = getControllers(request);

  try {
    const gasFeeController = new GasFeeController({
      messenger: controllerMessenger,
      getProvider: () =>
        // @ts-expect-error at this point in time the provider will be defined by the `networkController.initializeProvider`
        networkController.getProviderAndBlockTracker().provider,
      getCurrentNetworkEIP1559Compatibility: async () =>
        (await networkController.getEIP1559Compatibility()) ?? false,
      getCurrentNetworkLegacyGasAPICompatibility: () => {
        const chainId = getGlobalChainId();
        return (
          isMainnetByChainId(chainId) ||
          chainId === addHexPrefix(swapsUtils.BSC_CHAIN_ID) ||
          chainId === addHexPrefix(swapsUtils.POLYGON_CHAIN_ID)
        );
      },
      clientId: AppConstants.SWAPS.CLIENT_ID,
      legacyAPIEndpoint: LEGACY_GAS_API_ENDPOINT,
      EIP1559APIEndpoint: EIP1559_API_ENDPOINT,
    });

    return { controller: gasFeeController };
  } catch (error) {
    Logger.error(error as Error, 'Failed to initialize GasFeeController');
    throw error;
  }
};

function getControllers(
  request: ControllerInitRequest<GasFeeControllerMessenger>,
) {
  return {
    networkController: request.getController('NetworkController'),
  };
}
