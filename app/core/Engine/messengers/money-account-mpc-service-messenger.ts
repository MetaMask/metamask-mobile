import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
import type { RootMessenger } from '../types';
import type { MoneyAccountMpcMessenger } from '../services/money-account-mpc-service';

/**
 * Create the messenger for MoneyAccountMpcService.
 *
 * @param messenger - The root messenger.
 * @returns The service messenger.
 */
export function getMoneyAccountMpcServiceMessenger(
  messenger: RootMessenger<
    MessengerActions<MoneyAccountMpcMessenger>,
    MessengerEvents<MoneyAccountMpcMessenger>
  >,
): MoneyAccountMpcMessenger {
  const serviceMessenger: MoneyAccountMpcMessenger = new Messenger({
    namespace: 'MoneyAccountMpcService',
    parent: messenger,
  });

  messenger.delegate({
    messenger: serviceMessenger,
    actions: [
      'KeyringController:getState',
      'KeyringController:addNewKeyring',
      'KeyringController:withKeyring',
      'MoneyAccountController:init',
      'MoneyAccountController:migrateMoneyAccountAddress',
    ],
    events: [],
  });

  return serviceMessenger;
}
