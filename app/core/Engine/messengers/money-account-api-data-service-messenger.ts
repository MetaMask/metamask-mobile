import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
import { type MoneyAccountApiDataServiceMessenger } from '@metamask/money-account-api-data-service';
import { RootMessenger } from '../types';

/**
 * Get the messenger for the money account API data service. This is scoped to the
 * actions and events that the money account API data service is allowed to handle.
 *
 * @param rootMessenger - The root messenger.
 * @returns The MoneyAccountApiDataServiceMessenger.
 */
export function getMoneyAccountApiDataServiceMessenger(
  rootMessenger: RootMessenger<
    MessengerActions<MoneyAccountApiDataServiceMessenger>,
    MessengerEvents<MoneyAccountApiDataServiceMessenger>
  >,
): MoneyAccountApiDataServiceMessenger {
  return new Messenger({
    namespace: 'MoneyAccountApiDataService',
    parent: rootMessenger,
  });
}
