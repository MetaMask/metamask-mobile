import {
  MultichainAssetsRatesController,
  type MultichainAssetsRatesControllerMessenger,
  MultichainAssetsRatesControllerState,
} from '@metamask/assets-controllers';
import { defaultMultichainBalancesControllerState } from './constants';
import type { ControllerInitFunction } from '../../types';

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
