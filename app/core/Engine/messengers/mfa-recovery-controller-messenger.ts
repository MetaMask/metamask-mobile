import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
import type { RemoteFeatureFlagControllerGetStateAction } from '@metamask/remote-feature-flag-controller';
import type {
  KeyringControllerExportEncryptionKeyAction,
  KeyringControllerGetStateAction,
} from '@metamask/keyring-controller';
import type { MfaRecoveryControllerMessenger } from '@metamask/mfa-recovery-controller';
import type { RootMessenger } from '../types';

type AllowedActions = MessengerActions<MfaRecoveryControllerMessenger>;
type AllowedEvents = MessengerEvents<MfaRecoveryControllerMessenger>;

/** Returns the messenger scoped to the MFA recovery controller. */
export function getMfaRecoveryControllerMessenger(
  rootMessenger: RootMessenger<AllowedActions, AllowedEvents>,
): MfaRecoveryControllerMessenger {
  return new Messenger({
    namespace: 'MfaRecoveryController',
    parent: rootMessenger,
  });
}

/**
 * Left-hand social unlock only: identifier auth (feature flags) + pending
 * encryptor (keyring). No Auth API MFA approval / Cubist session actions.
 */
type MfaRecoveryControllerInitMessengerActions =
  | KeyringControllerExportEncryptionKeyAction
  | KeyringControllerGetStateAction
  | RemoteFeatureFlagControllerGetStateAction;

export type MfaRecoveryControllerInitMessenger = Messenger<
  'MfaRecoveryControllerInitialization',
  MfaRecoveryControllerInitMessengerActions
>;

/** Returns the initialization messenger for MFA recovery dependencies. */
export function getMfaRecoveryControllerInitMessenger(
  rootMessenger: RootMessenger<
    MessengerActions<MfaRecoveryControllerInitMessenger>,
    MessengerEvents<MfaRecoveryControllerInitMessenger>
  >,
): MfaRecoveryControllerInitMessenger {
  const messenger: MfaRecoveryControllerInitMessenger = new Messenger({
    namespace: 'MfaRecoveryControllerInitialization',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: [
      'KeyringController:exportEncryptionKey',
      'KeyringController:getState',
      'RemoteFeatureFlagController:getState',
    ],
    messenger,
  });
  return messenger;
}
