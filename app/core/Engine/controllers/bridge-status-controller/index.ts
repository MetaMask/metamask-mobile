import {
  BridgeStatusController,
  type BridgeStatusControllerMessenger,
} from '@metamask/bridge-status-controller';
import { ControllerInitFunction } from '../../types';
import { BridgeClientId } from '@metamask/bridge-controller';

/**
 * Initialize the BridgeStatusController.
 *
 * @param request - The request object.
 * @returns The BridgeStatusController.
 */
export const bridgeStatusControllerInit: ControllerInitFunction<
  BridgeStatusController,
  BridgeStatusControllerMessenger
> = (request) => {
  const { controllerMessenger, persistedState } = request;

  const controller = new BridgeStatusController({
    messenger: controllerMessenger,
    state: persistedState.BridgeStatusController,
    clientId: BridgeClientId.MOBILE,
    fetchFn: fetch,
  });

  return { controller };
};
