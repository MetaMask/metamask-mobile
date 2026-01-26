import {
  NetworkEnablementController,
  type NetworkEnablementControllerMessenger,
  NetworkEnablementControllerState,
} from '@metamask/network-enablement-controller';
import type { ControllerInitFunction } from '../../types';

/**
 * Initialize the NetworkEnablementController.
 *
 * @param request - The request object.
 * @returns The NetworkEnablementController.
 */
export const networkEnablementControllerInit: ControllerInitFunction<
  NetworkEnablementController,
  NetworkEnablementControllerMessenger
> = (request) => {
  const { controllerMessenger, persistedState } = request;

  const networkEnablementControllerState =
    persistedState.NetworkEnablementController as NetworkEnablementControllerState;

  const controller = new NetworkEnablementController({
    messenger: controllerMessenger,
    state: networkEnablementControllerState,
  });

  controller.init();

  return { controller };
};
