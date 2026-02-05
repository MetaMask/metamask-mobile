import {
  ClientStateController,
  type ClientStateControllerMessenger,
} from '@metamask/client-state-controller';
import type { ControllerInitRequest } from '../../types';

/**
 * Initialize the ClientStateController.
 *
 * @param initRequest - The initialization request.
 * @returns The ClientStateController.
 */
export function clientStateControllerInit(
  initRequest: ControllerInitRequest<ClientStateControllerMessenger>,
): { controller: ClientStateController } {
  const { controllerMessenger } = initRequest;

  const controller = new ClientStateController({
    messenger: controllerMessenger,
  });

  return { controller };
}
