import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
import type { RootMessenger } from '../types';
import type { MpcSigningMfaControllerMessenger } from '../controllers/mpc-signing-mfa-controller';

/**
 * Create the restricted messenger for MpcSigningMfaController.
 *
 * @param messenger - The root messenger.
 * @returns The controller messenger.
 */
export function getMpcSigningMfaControllerMessenger(
  messenger: RootMessenger<
    MessengerActions<MpcSigningMfaControllerMessenger>,
    MessengerEvents<MpcSigningMfaControllerMessenger>
  >,
): MpcSigningMfaControllerMessenger {
  return new Messenger({
    namespace: 'MpcSigningMfaController',
    parent: messenger,
  });
}
