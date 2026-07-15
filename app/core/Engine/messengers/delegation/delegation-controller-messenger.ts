import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import { type DelegationControllerMessenger } from '@metamask/delegation-controller';
import { TransactionControllerTransactionStatusUpdatedEvent } from '@metamask/transaction-controller';
import { RootMessenger } from '../../types';

const name = 'DelegationController' as const;

export type DelegationControllerInitMessenger = Messenger<
  'DelegationControllerInit',
  never,
  TransactionControllerTransactionStatusUpdatedEvent
>;

export function getDelegationControllerMessenger(
  rootMessenger: RootMessenger<
    MessengerActions<DelegationControllerMessenger>,
    MessengerEvents<DelegationControllerMessenger>
  >,
): DelegationControllerMessenger {
  const messenger: DelegationControllerMessenger = new Messenger({
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
  rootMessenger: RootMessenger<
    MessengerActions<DelegationControllerInitMessenger>,
    MessengerEvents<DelegationControllerInitMessenger>
  >,
): DelegationControllerInitMessenger {
  const messenger: DelegationControllerInitMessenger = new Messenger({
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
