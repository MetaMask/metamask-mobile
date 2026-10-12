import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
import type { AuthenticationController } from '@metamask/profile-sync-controller';
import type { RemoteFeatureFlagControllerGetStateAction } from '@metamask/remote-feature-flag-controller';
import type {
  KeyringControllerExportEncryptionKeyAction,
  KeyringControllerGetStateAction,
  KeyringControllerSignPersonalMessageAction,
  KeyringControllerUnlockEvent,
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

type MfaRecoveryControllerInitMessengerActions =
  | AuthenticationController.AuthenticationControllerGetBearerTokenAction
  | KeyringControllerSignPersonalMessageAction
  | KeyringControllerExportEncryptionKeyAction
  | KeyringControllerGetStateAction
  | RemoteFeatureFlagControllerGetStateAction;

type MfaRecoveryControllerInitMessengerEvents = KeyringControllerUnlockEvent;

export type MfaRecoveryControllerInitMessenger = Messenger<
  'MfaRecoveryControllerInitialization',
  MfaRecoveryControllerInitMessengerActions,
  MfaRecoveryControllerInitMessengerEvents
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
      'AuthenticationController:getBearerToken',
      'KeyringController:signPersonalMessage',
      'KeyringController:exportEncryptionKey',
      'KeyringController:getState',
      'RemoteFeatureFlagController:getState',
    ],
    events: ['KeyringController:unlock'],
    messenger,
  });
  return messenger;
}
