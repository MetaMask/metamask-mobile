import {
  ClientController,
  type ClientControllerMessenger,
} from '@metamask/client-controller';
import type { ControllerInitRequest } from '../../types';

/**
 * Initialize the ClientController.
 *
 * @param initRequest - The initialization request.
 * @returns The ClientController.
 */
export function clientControllerInit(
  initRequest: ControllerInitRequest<ClientControllerMessenger>,
): { controller: ClientController } {
  const { controllerMessenger } = initRequest;

  const controller = new ClientController({
    messenger: controllerMessenger,
  });

  return { controller };
}
