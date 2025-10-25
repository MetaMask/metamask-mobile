import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import { type DelegationControllerMessenger } from '@metamask/delegation-controller';
import { TransactionControllerTransactionStatusUpdatedEvent } from '@metamask/transaction-controller';
import { RootMessenger } from '../../types';

const name = 'DelegationController' as const;

export type DelegationControllerInitMessenger = ReturnType<
  typeof getDelegationControllerInitMessenger
>;

export function getDelegationControllerMessenger(
  rootMessenger: RootMessenger,
): DelegationControllerMessenger {
  const messenger = new Messenger<
    typeof name,
    MessengerActions<DelegationControllerMessenger>,
    MessengerEvents<DelegationControllerMessenger>,
    RootMessenger
  >({
    namespace: name,
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: [
      'AccountsController:getSelectedAccount',
      'KeyringController:signTypedMessage',
    ],
    events: [],
    messenger,
  });
  return messenger;
}

export function getDelegationControllerInitMessenger(
  rootMessenger: RootMessenger,
) {
  const messenger = new Messenger<
    'DelegationControllerInit',
    never,
    TransactionControllerTransactionStatusUpdatedEvent,
    RootMessenger
  >({
    namespace: 'DelegationControllerInit',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: [],
    events: ['TransactionController:transactionStatusUpdated'],
    messenger,
  });
  return messenger;
}
