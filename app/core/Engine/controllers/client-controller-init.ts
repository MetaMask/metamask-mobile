import { MessengerClientInitFunction } from '../types';
import {
  ClientController,
  ClientControllerMessenger,
} from '@metamask/client-controller';

/**
 * Initialize the ClientController.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @param request.persistedState - The persisted state.
 * @returns The initialized controller.
 */
export const clientControllerInit: MessengerClientInitFunction<
  ClientController,
  ClientControllerMessenger
> = ({ controllerMessenger, persistedState }) => {
  const controller = new ClientController({
    messenger: controllerMessenger,
    state: persistedState.ClientController,
  });

  return {
    controller,
  };
};
