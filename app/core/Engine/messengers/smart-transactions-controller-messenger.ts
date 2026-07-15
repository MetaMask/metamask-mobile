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
  rootMessenger: RootMessenger<
    MessengerActions<SmartTransactionsControllerMessenger>,
    MessengerEvents<SmartTransactionsControllerMessenger>
  >,
): SmartTransactionsControllerMessenger {
  const messenger: SmartTransactionsControllerMessenger = new Messenger({
    namespace: 'SmartTransactionsController',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: [
      'AuthenticationController:getBearerToken',
      'NetworkController:getNetworkClientById',
      'NetworkController:getState',
      'RemoteFeatureFlagController:getState',
      'TransactionController:getNonceLock',
      'TransactionController:getTransactions',
      'TransactionController:updateTransaction',
    ],
    events: [
      'NetworkController:stateChange',
      'RemoteFeatureFlagController:stateChange',
    ],
    messenger,
  });
  return messenger;
}

type SmartTransactionsControllerInitMessengerActions =
  AnalyticsControllerActions;

export type SmartTransactionsControllerInitMessenger = Messenger<
  'SmartTransactionsControllerInit',
  SmartTransactionsControllerInitMessengerActions,
  never
>;

/**
 * Get the SmartTransactionsControllerInitMessenger for the SmartTransactionsController.
 * This messenger is used during controller initialization to call other controllers.
 *
 * @param rootMessenger - The root messenger.
 * @returns The SmartTransactionsControllerInitMessenger.
 */
export function getSmartTransactionsControllerInitMessenger(
  rootMessenger: RootMessenger<
    MessengerActions<SmartTransactionsControllerInitMessenger>,
    MessengerEvents<SmartTransactionsControllerInitMessenger>
  >,
): SmartTransactionsControllerInitMessenger {
  const messenger: SmartTransactionsControllerInitMessenger = new Messenger({
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
