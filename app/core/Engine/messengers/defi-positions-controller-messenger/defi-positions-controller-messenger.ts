import { KeyringControllerLockEvent } from '@metamask/keyring-controller';
import { TransactionControllerTransactionConfirmedEvent } from '@metamask/transaction-controller';
import { Messenger } from '@metamask/base-controller';
import { RemoteFeatureFlagControllerGetStateAction } from '@metamask/remote-feature-flag-controller';
import {
  AccountTreeControllerGetAccountsFromSelectedAccountGroupAction,
  AccountTreeControllerSelectedAccountGroupChangeEvent,
} from '@metamask/account-tree-controller';

type AllowedActions =
  AccountTreeControllerGetAccountsFromSelectedAccountGroupAction;

type AllowedEvents =
  | KeyringControllerLockEvent
  | TransactionControllerTransactionConfirmedEvent
  | AccountTreeControllerSelectedAccountGroupChangeEvent;

export type DeFiPositionsControllerMessenger = ReturnType<
  typeof getDeFiPositionsControllerMessenger
>;

/**
 * Get a restricted messenger for the DeFiPositionsController.
 *
 * @param messenger - The messenger to restrict.
 * @returns The restricted messenger.
 */
export function getDeFiPositionsControllerMessenger(
  messenger: Messenger<AllowedActions, AllowedEvents>,
) {
  return messenger.getRestricted({
    name: 'DeFiPositionsController',
    allowedActions: [
      'AccountTreeController:getAccountsFromSelectedAccountGroup',
    ],
    allowedEvents: [
      'KeyringController:lock',
      'TransactionController:transactionConfirmed',
      'AccountTreeController:selectedAccountGroupChange',
    ],
  });
}

type InitActions = RemoteFeatureFlagControllerGetStateAction;

export type DeFiPositionsControllerInitMessenger = ReturnType<
  typeof getDeFiPositionsControllerInitMessenger
>;

export function getDeFiPositionsControllerInitMessenger(
  messenger: Messenger<InitActions, never>,
) {
  return messenger.getRestricted({
    name: 'DeFiPositionsControllerInit',
    allowedActions: ['RemoteFeatureFlagController:getState'],
    allowedEvents: [],
  });
}
