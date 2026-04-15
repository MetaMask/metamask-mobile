import { MessengerClientInitFunction } from '../types';
import {
  TokensController,
  type TokensControllerMessenger,
} from '@metamask/assets-controllers';
import { TokensControllerInitMessenger } from '../messengers/tokens-controller-messenger';
import { getGlobalChainId } from '../../../util/networks/global-network';
import { assert } from '@metamask/utils';

/**
 * Initialize the tokens controller.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @returns The initialized controller.
 */
export const tokensControllerInit: MessengerClientInitFunction<
  TokensController,
  TokensControllerMessenger,
  TokensControllerInitMessenger
> = ({
  controllerMessenger,
  initMessenger,
  persistedState,
  getMessengerClient,
}) => {
  const networkController = getMessengerClient('NetworkController');
  const { provider } =
    initMessenger.call('NetworkController:getSelectedNetworkClient') ?? {};

  assert(provider, 'Provider is required to initialize `TokensController`.');

  const controller = new TokensController({
    state: persistedState.TokensController,
    messenger: controllerMessenger,
    chainId: getGlobalChainId(networkController),
    provider,
  });

  return {
    controller,
  };
};
