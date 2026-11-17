import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
import type { AuthenticationController } from '@metamask/profile-sync-controller';
import type { RemoteFeatureFlagControllerGetStateAction } from '@metamask/remote-feature-flag-controller';
import type {
  KeyringControllerGetStateAction,
  KeyringControllerSignPersonalMessageAction,
} from '@metamask/keyring-controller';
import type { MfaRecoveryControllerMessenger } from '@metamask/mfa-recovery-controller';
import type { MfaRecoveryServiceMessenger } from '../controllers/mfa-recovery-controller/services/mfa-recovery-service';
import type { RootMessenger } from '../types';

type AllowedActions = MessengerActions<MfaRecoveryControllerMessenger>;
type AllowedEvents = MessengerEvents<MfaRecoveryControllerMessenger>;

/** Returns the messenger scoped to the MFA recovery controller. */
export function getMfaRecoveryControllerMessenger(
  rootMessenger: RootMessenger<AllowedActions, AllowedEvents>,
): MfaRecoveryControllerMessenger {
  const messenger: MfaRecoveryControllerMessenger = new Messenger({
    namespace: 'MfaRecoveryController',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: [
      'AuthenticationController:refreshCanonicalProfileId',
      'AuthenticationController:requestMfaApproval',
    ],
    messenger,
  });
  return messenger;
}

type MfaRecoveryControllerInitMessengerActions =
  | AuthenticationController.AuthenticationControllerGetBearerTokenAction
  | AuthenticationController.AuthenticationControllerRefreshCanonicalProfileIdAction
  | AuthenticationController.AuthenticationControllerExchangeSocialAccessTokenAction
  | KeyringControllerGetStateAction
  | KeyringControllerSignPersonalMessageAction
  | RemoteFeatureFlagControllerGetStateAction;

export type MfaRecoveryControllerInitMessenger = Messenger<
  'MfaRecoveryControllerInitialization',
  MfaRecoveryControllerInitMessengerActions,
  never
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
      'AuthenticationController:refreshCanonicalProfileId',
      'AuthenticationController:exchangeSocialAccessToken',
      'KeyringController:getState',
      'KeyringController:signPersonalMessage',
      'RemoteFeatureFlagController:getState',
    ],
    messenger,
  });
  return messenger;
}

/** The controller actions the MFA recovery service may call. */
export const MFA_RECOVERY_SERVICE_ACTIONS = [
  'AuthenticationController:getVerificationToken',
  'AuthenticationController:requestMfaApproval',
  'KeyringController:getState',
  'MfaRecoveryController:abort',
  'MfaRecoveryController:authenticateIdentifier',
  'MfaRecoveryController:getIdentifiers',
  'MfaRecoveryController:getPhase',
  'MfaRecoveryController:getRecoverySecret',
  'MfaRecoveryController:register',
  'MfaRecoveryController:resume',
  'MfaRecoveryController:updateIdentifiers',
  'SeedlessOnboardingController:authenticateForRecovery',
  'SeedlessOnboardingController:getAccessToken',
  'SeedlessOnboardingController:getState',
  'SeedlessOnboardingController:migrateToEnvelope',
  'SeedlessOnboardingController:recoverWithRecoverySecret',
  'SeedlessOnboardingController:resetPasswordWithVaultKeys',
  'SeedlessOnboardingController:runMigrations',
  'SeedlessOnboardingController:setLocalPassword',
] as const satisfies readonly MessengerActions<MfaRecoveryServiceMessenger>['type'][];

/** Returns the messenger the MFA recovery service reaches controllers with. */
export function getMfaRecoveryServiceMessenger(
  rootMessenger: RootMessenger<
    MessengerActions<MfaRecoveryServiceMessenger>,
    MessengerEvents<MfaRecoveryServiceMessenger>
  >,
): MfaRecoveryServiceMessenger {
  const messenger: MfaRecoveryServiceMessenger = new Messenger({
    namespace: 'MfaRecoveryService',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: [...MFA_RECOVERY_SERVICE_ACTIONS],
    messenger,
  });
  return messenger;
}
