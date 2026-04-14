import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
import { type MoneyAccountBalanceServiceMessenger } from '@metamask/money-account-balance-service';
import { RootMessenger } from '../types';

/**
 * Get the messenger for the money account balance service. This is scoped to the
 * actions and events that the money account balance service is allowed to handle.
 *
 * @param rootMessenger - The root messenger.
 * @returns The MoneyAccountBalanceServiceMessenger.
 */
export function getMoneyAccountBalanceServiceMessenger(
  rootMessenger: RootMessenger,
): MoneyAccountBalanceServiceMessenger {
  return new Messenger<
    'MoneyAccountBalanceService',
    MessengerActions<MoneyAccountBalanceServiceMessenger>,
    MessengerEvents<MoneyAccountBalanceServiceMessenger>,
    RootMessenger
  >({ namespace: 'MoneyAccountBalanceService', parent: rootMessenger });
}
