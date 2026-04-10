import {
  MultichainAssetsController,
  type MultichainAssetsControllerMessenger,
  MultichainAssetsControllerState,
} from '@metamask/assets-controllers';
import type { MessengerClientInitFunction } from '../../types';

/**
 * Initialize the MultichainAssetsController.
 *
 * @param request - The request object.
 * @returns The MultichainAssetsController.
 */
export const multichainAssetsControllerInit: MessengerClientInitFunction<
  MultichainAssetsController,
  MultichainAssetsControllerMessenger
> = (request) => {
  const { controllerMessenger, persistedState } = request;

  const multichainAssetsControllerState =
    persistedState.MultichainAssetsController as MultichainAssetsControllerState;

  const messengerClient = new MultichainAssetsController({
    messenger: controllerMessenger,
    state: multichainAssetsControllerState,
  });

  return { messengerClient };
};
