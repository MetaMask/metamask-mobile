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
  // @ts-expect-error - TODO: fix this mismatch type between the controller messenger and the base restricted controller messenger
  NetworkEnablementControllerMessenger
> = (request) => {
  const { controllerMessenger, persistedState } = request;

  const networkEnablementControllerState =
    persistedState.NetworkEnablementController as NetworkEnablementControllerState;

  const controller = new NetworkEnablementController({
    messenger: controllerMessenger,
    state: networkEnablementControllerState,
  });

  return { controller };
};
