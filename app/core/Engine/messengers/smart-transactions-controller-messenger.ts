import { Messenger } from '@metamask/base-controller';
import type {
  NetworkControllerGetNetworkClientByIdAction,
  NetworkControllerGetStateAction,
  NetworkControllerStateChangeEvent,
} from '@metamask/network-controller';
import type {
  TransactionControllerConfirmExternalTransactionAction,
  TransactionControllerGetNonceLockAction,
  TransactionControllerGetTransactionsAction,
  TransactionControllerUpdateTransactionAction,
} from '@metamask/transaction-controller';

type AllowedActions =
  | NetworkControllerGetNetworkClientByIdAction
  | NetworkControllerGetStateAction
  | TransactionControllerGetNonceLockAction
  | TransactionControllerConfirmExternalTransactionAction
  | TransactionControllerGetTransactionsAction
  | TransactionControllerUpdateTransactionAction;

type AllowedEvents = NetworkControllerStateChangeEvent;

export type SmartTransactionsControllerMessenger = ReturnType<
  typeof getSmartTransactionsControllerMessenger
>;

/**
 * Get a messenger restricted to the actions and events that the
 * smart transactions controller is allowed to handle.
 *
 * @param messenger - The controller messenger to restrict.
 * @returns The restricted controller messenger.
 */
export function getSmartTransactionsControllerMessenger(
  messenger: Messenger<AllowedActions, AllowedEvents>,
) {
  return messenger.getRestricted({
    name: 'SmartTransactionsController',
    allowedActions: [
      'NetworkController:getNetworkClientById',
      'NetworkController:getState',
      'TransactionController:getNonceLock',
      'TransactionController:confirmExternalTransaction',
      'TransactionController:getTransactions',
      'TransactionController:updateTransaction',
    ],
    allowedEvents: ['NetworkController:stateChange'],
  });
}
