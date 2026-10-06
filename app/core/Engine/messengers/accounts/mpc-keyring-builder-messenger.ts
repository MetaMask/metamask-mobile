import { Messenger } from '@metamask/messenger';
import type { RootMessenger } from '../../types';
import type { MpcKeyringBuilderMessenger } from '../../wallet-init/mpc-keyring-builder';

export type { MpcKeyringBuilderMessenger };

/**
 * Create the messenger used by the MPC keyring builder.
 *
 * @param messenger - The root messenger.
 * @returns The MPC keyring builder messenger.
 */
export function getMpcKeyringBuilderMessenger(
  messenger: RootMessenger,
): MpcKeyringBuilderMessenger {
  const mpcKeyringMessenger: MpcKeyringBuilderMessenger = new Messenger({
    namespace: 'MpcKeyringBuilder',
    parent: messenger,
  });

  messenger.delegate({
    messenger: mpcKeyringMessenger,
    actions: [
      'KeyringController:withKeyringUnsafe',
      'AuthenticationController:getBearerToken',
      'MpcSigningMfaController:requestSigningConfirmation',
    ],
  });

  return mpcKeyringMessenger;
}
