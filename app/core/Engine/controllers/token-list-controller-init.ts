import { ControllerInitFunction } from '../types';
import {
  TokenListController,
  type TokenListControllerMessenger,
} from '@metamask/assets-controllers';
import { TokenListControllerInitMessenger } from '../messengers/token-list-controller-messenger';
import { getGlobalChainId } from '../../../util/networks/global-network';

/**
 * Initialize the tokenList controller.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @returns The initialized controller.
 */
export const tokenListControllerInit: ControllerInitFunction<
  TokenListController,
  TokenListControllerMessenger,
  TokenListControllerInitMessenger
> = ({ controllerMessenger, initMessenger, getController }) => {
  const networkController = getController('NetworkController');

  const controller = new TokenListController({
    messenger: controllerMessenger,
    chainId: getGlobalChainId(networkController),
    onNetworkStateChange: (listener) =>
      initMessenger.subscribe('NetworkController:stateChange', listener),
  });

  return {
    controller,
  };
};
