import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import { RootMessenger } from '../types';
import { SmartTransactionsControllerMessenger } from '@metamask/smart-transactions-controller';
import { AnalyticsControllerActions } from '@metamask/analytics-controller';

/**
 * Get the messenger for the smart transactions controller. This is scoped to the
 * actions and events that the smart transactions controller is allowed to handle
 *
 * @param rootMessenger - The root messenger.
 * @returns The SmartTransactionsControllerMessenger.
 */
export function getSmartTransactionsControllerMessenger(
  rootMessenger: RootMessenger,
): SmartTransactionsControllerMessenger {
  const messenger = new Messenger<
    'SmartTransactionsController',
    MessengerActions<SmartTransactionsControllerMessenger>,
    MessengerEvents<SmartTransactionsControllerMessenger>,
    RootMessenger
  >({
    namespace: 'SmartTransactionsController',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: [
      'NetworkController:getNetworkClientById',
      'NetworkController:getState',
      'TransactionController:getNonceLock',
      'TransactionController:getTransactions',
      'TransactionController:updateTransaction',
    ],
    events: ['NetworkController:stateChange'],
    messenger,
  });
  return messenger;
}

type SmartTransactionsControllerInitMessengerActions =
  AnalyticsControllerActions;

/**
 * Get the SmartTransactionsControllerInitMessenger for the SmartTransactionsController.
 * This messenger is used during controller initialization to call other controllers.
 *
 * @param rootMessenger - The root messenger.
 * @returns The SmartTransactionsControllerInitMessenger.
 */
export type SmartTransactionsControllerInitMessenger = ReturnType<
  typeof getSmartTransactionsControllerInitMessenger
>;

export function getSmartTransactionsControllerInitMessenger(
  rootMessenger: RootMessenger,
): Messenger<
  'SmartTransactionsControllerInit',
  SmartTransactionsControllerInitMessengerActions,
  never,
  RootMessenger
> {
  const messenger = new Messenger<
    'SmartTransactionsControllerInit',
    SmartTransactionsControllerInitMessengerActions,
    never,
    RootMessenger
  >({
    namespace: 'SmartTransactionsControllerInit',
    parent: rootMessenger,
  });

  rootMessenger.delegate({
    actions: ['AnalyticsController:trackEvent'],
    events: [],
    messenger,
  });

  return messenger;
}
