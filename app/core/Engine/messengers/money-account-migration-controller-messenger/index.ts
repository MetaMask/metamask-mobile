import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
import type { MoneyAccountMigrationControllerMessenger } from '../../controllers/money-account-migration-controller/types';
import type { RootMessenger } from '../../types';

/**
 * Get the MoneyAccountMigrationControllerMessenger.
 *
 * @param rootMessenger - The root messenger.
 * @returns The MoneyAccountMigrationControllerMessenger.
 */
export function getMoneyAccountMigrationControllerMessenger(
  rootMessenger: RootMessenger,
): MoneyAccountMigrationControllerMessenger {
  const messenger = new Messenger<
    'MoneyAccountMigrationController',
    MessengerActions<MoneyAccountMigrationControllerMessenger>,
    MessengerEvents<MoneyAccountMigrationControllerMessenger>,
    RootMessenger
  >({
    namespace: 'MoneyAccountMigrationController',
    parent: rootMessenger,
  });

  return messenger;
}
