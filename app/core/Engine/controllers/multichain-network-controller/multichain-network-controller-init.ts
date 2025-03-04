import {
  MultichainNetworkController,
  MultichainNetworkControllerMessenger,
  MultichainNetworkControllerState,
} from '@metamask/multichain-network-controller';
import { ControllerInitFunction } from '../../types';

/**
 * Initialize the MultichainNetworkController.
 *
 * @param request - The request object.
 * @returns The MultichainNetworkController.
 */
export const multichainNetworkControllerInit: ControllerInitFunction<
  MultichainNetworkController,
  MultichainNetworkControllerMessenger
> = (request) => {
  const { controllerMessenger, persistedState } = request;

  const multichainNetworkControllerState =
    persistedState.MultichainNetworkController as MultichainNetworkControllerState;

  const controller = new MultichainNetworkController({
    messenger: controllerMessenger,
    state: multichainNetworkControllerState,
  });

  return { controller };
};
