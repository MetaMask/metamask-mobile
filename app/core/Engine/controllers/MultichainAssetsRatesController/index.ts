import {
  MultiChainAssetsRatesController as MultichainAssetsRatesController, // TODO: Remove this once the assets-controllers package is updated > 51.0.0
  type MultichainAssetsRatesControllerMessenger,
  MultichainAssetsRatesControllerState,
} from '@metamask/assets-controllers';
import { defaultMultichainBalancesControllerState } from './constants';
import type { ControllerInitFunction } from '../../types';

// Export constants
export * from './constants';

/**
 * Initialize the MultichainAssetsRatesController.
 *
 * @param request - The request object.
 * @returns The MultichainAssetsRatesController.
 */
export const multichainAssetsRatesControllerInit: ControllerInitFunction<
  MultichainAssetsRatesController,
  MultichainAssetsRatesControllerMessenger
> = (request) => {
  const { controllerMessenger, persistedState } = request;

  const multichainAssetsRatesControllerState =
    (persistedState.MultichainAssetsRatesController ??
      defaultMultichainBalancesControllerState) as MultichainAssetsRatesControllerState;

  const controller = new MultichainAssetsRatesController({
    messenger: controllerMessenger,
    state: multichainAssetsRatesControllerState,
  });

  return { controller };
};
