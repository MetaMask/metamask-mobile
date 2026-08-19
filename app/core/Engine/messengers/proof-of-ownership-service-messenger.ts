import { ProofOfOwnershipServiceMessenger } from '@metamask/profile-metrics-controller';
import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import { RootMessenger } from '../types';

type AllowedActions = MessengerActions<ProofOfOwnershipServiceMessenger>;

type AllowedEvents = MessengerEvents<ProofOfOwnershipServiceMessenger>;

/**
 * Create a messenger restricted to the allowed actions and events of the
 * proof of ownership service.
 *
 * @param rootMessenger - The base messenger used to create the restricted
 * messenger.
 */
export function getProofOfOwnershipServiceMessenger(
  rootMessenger: RootMessenger<AllowedActions, AllowedEvents>,
): ProofOfOwnershipServiceMessenger {
  const serviceMessenger: ProofOfOwnershipServiceMessenger = new Messenger({
    namespace: 'ProofOfOwnershipService',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    messenger: serviceMessenger,
    actions: [
      'KeyringController:signPersonalMessage',
      'SnapController:handleRequest',
    ],
  });
  return serviceMessenger;
}
