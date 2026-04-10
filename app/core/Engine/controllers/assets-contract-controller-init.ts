import { MessengerClientInitFunction } from '../types';
import {
  AssetsContractController,
  type AssetsContractControllerMessenger,
} from '@metamask/assets-controllers';
import { getGlobalChainId } from '../../../util/networks/global-network';

/**
 * Initialize the assets contract controller.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @returns The initialized controller.
 */
export const assetsContractControllerInit: MessengerClientInitFunction<
  AssetsContractController,
  AssetsContractControllerMessenger
> = ({ controllerMessenger, getMessengerClient }) => {
  const networkController = getMessengerClient('NetworkController');
  const messengerClient = new AssetsContractController({
    messenger: controllerMessenger,
    chainId: getGlobalChainId(networkController),
  });

  return {
    messengerClient,
  };
};
