import {
  MultichainAssetsRatesController,
  type MultichainAssetsRatesControllerMessenger,
  MultichainAssetsRatesControllerState,
} from '@metamask/assets-controllers';
import type { MessengerClientInitFunction } from '../../types';

/**
 * Initialize the MultichainAssetsRatesController.
 *
 * @param request - The request object.
 * @returns The MultichainAssetsRatesController.
 */
export const multichainAssetsRatesControllerInit: MessengerClientInitFunction<
  MultichainAssetsRatesController,
  MultichainAssetsRatesControllerMessenger
> = (request) => {
  const { controllerMessenger, persistedState } = request;

  const multichainAssetsRatesControllerState =
    persistedState.MultichainAssetsRatesController as MultichainAssetsRatesControllerState;

  const messengerClient = new MultichainAssetsRatesController({
    messenger: controllerMessenger,
    state: multichainAssetsRatesControllerState,
    interval: 180000,
  });

  return { messengerClient };
};
