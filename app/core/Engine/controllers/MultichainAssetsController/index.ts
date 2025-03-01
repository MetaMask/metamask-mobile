import {
  MultichainAssetsController,
  type MultichainAssetsControllerMessenger,
  MultichainAssetsControllerState,
} from '@metamask/assets-controllers';
import type { ControllerInitFunction } from '../../types';
import { defaultMultichainAssetsControllerState } from './constants';

// Export constants
export * from './constants';

/**
 * Initialize the MultichainAssetsController.
 *
 * @param request - The request object.
 * @returns The MultichainAssetsController.
 */
export const multichainAssetsControllerInit: ControllerInitFunction<
  MultichainAssetsController,
  MultichainAssetsControllerMessenger
> = (request) => {
  const { controllerMessenger, persistedState } = request;

  const multichainAssetsControllerState =
    (persistedState.MultichainAssetsController ??
      defaultMultichainAssetsControllerState) as MultichainAssetsControllerState;

  const controller = new MultichainAssetsController({
    messenger: controllerMessenger,
    state: multichainAssetsControllerState,
  });

  return { controller };
};
