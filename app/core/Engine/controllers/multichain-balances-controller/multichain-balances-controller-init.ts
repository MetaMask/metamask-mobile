import {
  MultichainBalancesController,
  MultichainBalancesControllerState,
  MultichainBalancesControllerMessenger,
} from '@metamask/assets-controllers';
import type { MessengerClientInitFunction } from '../../types';

/**
 * Initialize the MultichainBalancesController.
 *
 * @param request - The request object.
 * @returns The MultichainBalancesController.
 */
export const multichainBalancesControllerInit: MessengerClientInitFunction<
  MultichainBalancesController,
  MultichainBalancesControllerMessenger
> = (request) => {
  const { controllerMessenger, persistedState } = request;

  const multichainBalancesControllerState =
    persistedState.MultichainBalancesController as MultichainBalancesControllerState;

  const messengerClient = new MultichainBalancesController({
    messenger: controllerMessenger,
    state: multichainBalancesControllerState,
  });

  return { messengerClient };
};
