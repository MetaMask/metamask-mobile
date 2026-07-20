import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import { type DelegationControllerMessenger } from '@metamask/delegation-controller';
import { RootMessenger } from '../../types';

const name = 'DelegationController' as const;

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
    actions: ['KeyringController:signTypedMessage'],
    events: [],
    messenger,
  });
  return messenger;
}
