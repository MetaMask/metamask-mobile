import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import { MoneyAccountControllerMessenger } from '@metamask/money-account-controller';
import { RootMessenger } from '../types';

/**
 * Get a messenger restricted to the actions and events that the
 * money account controller is allowed to handle.
 *
 * @param rootMessenger - The root messenger to restrict.
 * @returns The restricted controller messenger.
 */
export function getMoneyAccountControllerMessenger(
  rootMessenger: RootMessenger,
): MoneyAccountControllerMessenger {
  const messenger = new Messenger<
    'MoneyAccountController',
    MessengerActions<MoneyAccountControllerMessenger>,
    MessengerEvents<MoneyAccountControllerMessenger>,
    RootMessenger
  >({ namespace: 'MoneyAccountController', parent: rootMessenger });

  rootMessenger.delegate({
    messenger,
    actions: [
      'KeyringController:getState',
      'KeyringController:addNewKeyring',
      'KeyringController:withKeyring',
    ],
    events: [],
  });

  return messenger;
}
