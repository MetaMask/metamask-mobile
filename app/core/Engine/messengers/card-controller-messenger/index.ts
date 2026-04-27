import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
import type { CardControllerMessenger } from '../../controllers/card-controller/types';
import type { RootMessenger } from '../../types';

/**
 * Get the CardControllerMessenger for the CardController.
 *
 * @param rootMessenger - The root messenger.
 * @returns The CardControllerMessenger.
 */
export function getCardControllerMessenger(
  rootMessenger: RootMessenger,
): CardControllerMessenger {
  const messenger = new Messenger<
    'CardController',
    MessengerActions<CardControllerMessenger>,
    MessengerEvents<CardControllerMessenger>,
    RootMessenger
  >({
    namespace: 'CardController',
    parent: rootMessenger,
  });

  rootMessenger.delegate({
    messenger,
    actions: [
      'AccountsController:getState',
      'AccountTreeController:getState',
      'RemoteFeatureFlagController:getState',
      'KeyringController:signPersonalMessage',
      'NetworkController:findNetworkClientIdByChainId',
      'TransactionController:addTransaction',
      'SnapController:handleRequest',
    ],
    events: [
      'AccountTreeController:stateChange',
      'KeyringController:unlock',
      'TransactionController:transactionConfirmed',
      'TransactionController:transactionFailed',
      'MultichainTransactionsController:stateChange',
    ],
  });

  return messenger;
}
