import { ControllerInitFunction } from '../types';
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
export const tokensControllerInit: ControllerInitFunction<
  TokensController,
  TokensControllerMessenger,
  TokensControllerInitMessenger
> = ({ controllerMessenger, initMessenger, persistedState, getController }) => {
  const networkController = getController('NetworkController');
  const { provider } =
    initMessenger.call('NetworkController:getSelectedNetworkClient') ?? {};

  assert(provider, 'Provider is required to initialize `TokensController`.');

  const controller = new TokensController({
    state: persistedState.TokensController,
    messenger: controllerMessenger,
    chainId: getGlobalChainId(networkController),
    // TODO: Remove @ts-expect-error once @metamask/network-controller is bumped in
    // @metamask/assets-controllers. The provider from NetworkController:getSelectedNetworkClient
    // is a SwappableProxy that's runtime-compatible with Provider but TypeScript can't verify
    // the private field requirement due to version mismatch.
    // @ts-expect-error - Provider type mismatch between SwappableProxy and InternalProvider
    provider,
  });

  return {
    controller,
  };
};
