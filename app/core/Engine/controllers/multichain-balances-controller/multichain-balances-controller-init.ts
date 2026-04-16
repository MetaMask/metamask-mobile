import {
  MultichainBalancesController,
  MultichainBalancesControllerState,
  MultichainBalancesControllerMessenger,
} from '@metamask/assets-controllers';
import type { ControllerInitFunction } from '../../types';

/**
 * Initialize the MultichainBalancesController.
 *
 * @param request - The request object.
 * @returns The MultichainBalancesController.
 */
export const multichainBalancesControllerInit: ControllerInitFunction<
  MultichainBalancesController,
  MultichainBalancesControllerMessenger
> = (request) => {
  const { controllerMessenger, persistedState } = request;

  const multichainBalancesControllerState =
    persistedState.MultichainBalancesController as MultichainBalancesControllerState;

  const controller = new MultichainBalancesController({
    messenger: controllerMessenger,
    state: multichainBalancesControllerState,
  });

  return { controller };
};
