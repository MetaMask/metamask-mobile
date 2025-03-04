import {
  BridgeStatusController,
  type BridgeStatusControllerMessenger,
  type BridgeStatusControllerState,
} from '@metamask/bridge-status-controller';
import { ControllerInitFunction } from '../../types';
import { BridgeClientId } from '@metamask/bridge-controller';
import { defaultBridgeStatusControllerState } from './constants';

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

  const bridgeStatusControllerState = (persistedState.BridgeStatusController ??
    defaultBridgeStatusControllerState) as BridgeStatusControllerState;

  const controller = new BridgeStatusController({
    messenger: controllerMessenger,
    state: bridgeStatusControllerState,
    clientId: BridgeClientId.MOBILE,
    fetchFn: fetch,
  });

  return { controller };
};
