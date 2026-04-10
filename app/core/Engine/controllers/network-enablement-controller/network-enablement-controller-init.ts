import {
  NetworkEnablementController,
  type NetworkEnablementControllerMessenger,
  NetworkEnablementControllerState,
} from '@metamask/network-enablement-controller';
import type { MessengerClientInitFunction } from '../../types';

/**
 * Initialize the NetworkEnablementController.
 *
 * @param request - The request object.
 * @returns The NetworkEnablementController.
 */
export const networkEnablementControllerInit: MessengerClientInitFunction<
  NetworkEnablementController,
  NetworkEnablementControllerMessenger
> = (request) => {
  const { controllerMessenger, persistedState } = request;

  const networkEnablementControllerState =
    persistedState.NetworkEnablementController as NetworkEnablementControllerState;

  const messengerClient = new NetworkEnablementController({
    messenger: controllerMessenger,
    state: networkEnablementControllerState,
  });

  return { messengerClient };
};
