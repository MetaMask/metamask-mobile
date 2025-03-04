import {
  MultichainBalancesController,
  MultichainBalancesControllerState,
  MultichainBalancesControllerMessenger,
} from '@metamask/assets-controllers';
import type { ControllerInitFunction } from '../../types';
import { defaultMultichainBalancesControllerState } from './constants';

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
    (persistedState.MultichainBalancesController ??
      defaultMultichainBalancesControllerState) as MultichainBalancesControllerState;

  const controller = new MultichainBalancesController({
    messenger: controllerMessenger,
    state: multichainBalancesControllerState,
  });

  return { controller };
};
