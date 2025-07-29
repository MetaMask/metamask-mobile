import { Messenger } from '@metamask/base-controller';
import type {
  AccountActivityServiceActions,
  AccountActivityServiceEvents,
} from '@metamask/backend-platform';

export type AccountActivityServiceMessenger = ReturnType<
  typeof getAccountActivityServiceMessenger
>;

/**
 * Get a restricted messenger for the Account Activity service. This is scoped to the
 * actions and events that the Account Activity service is allowed to handle.
 *
 * @param messenger - The messenger to restrict.
 * @returns The restricted messenger.
 */
export function getAccountActivityServiceMessenger(
  messenger: Messenger<AccountActivityServiceActions, AccountActivityServiceEvents>,
) {
  return messenger.getRestricted({
    name: 'AccountActivityService',
    allowedActions: [
      // Account Activity Service actions
      'AccountActivityService:subscribeAccounts',
      'AccountActivityService:unsubscribeAccounts',
      // Actions it can call on other controllers
      'AccountsController:listMultichainAccounts',
      'AccountsController:getAccountByAddress',
    ] as any,
    allowedEvents: [
      // Account Activity Service events it can publish
      'AccountActivityService:accountSubscribed',
      'AccountActivityService:accountUnsubscribed', 
      'AccountActivityService:transactionUpdated',
      'AccountActivityService:balanceUpdated',
      'AccountActivityService:subscriptionError',
      // Events it can subscribe to
      'AccountsController:accountAdded',
      'AccountsController:accountRemoved',
      'AccountsController:listMultichainAccounts',
    ] as any,
  });
} 