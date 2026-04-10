import {
  MultichainTransactionsController,
  MultichainTransactionsControllerState,
} from '@metamask/multichain-transactions-controller';
import type { MessengerClientInitFunction } from '../../types';
import { MultichainTransactionsControllerMessenger } from '../../messengers/multichain-transactions-controller-messenger/types';

/**
 * Initialize the MultichainTransactionsController.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @param request.persistedState - The persisted state of the extension.
 * @returns The initialized controller.
 */
export const multichainTransactionsControllerInit: MessengerClientInitFunction<
  MultichainTransactionsController,
  MultichainTransactionsControllerMessenger
> = (request) => {
  const { controllerMessenger, persistedState } = request;

  const multichainTransactionsControllerState =
    persistedState.MultichainTransactionsController as MultichainTransactionsControllerState;

  const messengerClient = new MultichainTransactionsController({
    messenger: controllerMessenger,
    state: multichainTransactionsControllerState,
  });

  return { messengerClient };
};
