import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
import type {
  KycControllerMessenger,
  KycControllerVerificationStatusChangedEvent,
} from '@metamask/kyc-controller';
import type { RootMessenger } from '../../types';

/**
 * Actions {@link KycController} calls on other messengers. Matches the
 * package's `AllowedActions` (every `KycService` method, Profile Sync
 * storage used to persist the UKYC local user secret, identity-sharing
 * consent, and the partner identity token).
 */
const KYC_CONTROLLER_DELEGATED_ACTIONS = [
  'KycService:getGeoCountry',
  'KycService:fetchVendorDisclaimers',
  'KycService:createMoonpaySession',
  'KycService:createVendorCustomer',
  'KycService:submitVendorDisclaimers',
  'KycService:fetchSessionDisclaimersByCountry',
  'KycService:fetchSessionDisclaimersBySessionId',
  'KycService:submitSessionDisclaimers',
  'KycService:fetchIdosEnclaveJwks',
  'KycService:fetchIdosRelayJwks',
  'KycService:createUkycSession',
  'KycService:resetWrappingKeys',
  'KycService:setAuthorizations',
  'KycService:createJourney',
  'KycService:getSessionStatus',
  'KycService:getSessionStatusForVendor',
  'UserStorageController:performGetStorage',
  'UserStorageController:performSetStorage',
  'AuthenticatedUserStorageService:putIdentitySharingConsent',
  'AuthenticationController:getPartnerIdentityToken',
] as const;

/**
 * Get the messenger for the KycController.
 *
 * Delegates KycService, UserStorageController, identity-sharing consent, and
 * partner identity token actions so the controller can call them through the
 * messenger.
 *
 * @param rootMessenger - The root messenger.
 * @returns The KycControllerMessenger.
 */
export function getKycControllerMessenger(
  rootMessenger: RootMessenger,
): KycControllerMessenger {
  const messenger = new Messenger<
    'KycController',
    MessengerActions<KycControllerMessenger>,
    MessengerEvents<KycControllerMessenger>,
    RootMessenger
  >({
    namespace: 'KycController',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: [...KYC_CONTROLLER_DELEGATED_ACTIONS],
    messenger,
  });
  return messenger;
}

export type KycControllerInitMessenger = ReturnType<
  typeof getKycControllerInitMessenger
>;

/**
 * Get the init messenger for the KycController. It only receives the
 * verification status event, which the init function maps to analytics.
 *
 * @param rootMessenger - The root messenger.
 * @returns The KycControllerInitMessenger.
 */
export function getKycControllerInitMessenger(rootMessenger: RootMessenger) {
  const messenger = new Messenger<
    'KycControllerInit',
    never,
    KycControllerVerificationStatusChangedEvent,
    RootMessenger
  >({
    namespace: 'KycControllerInit',
    parent: rootMessenger,
  });

  rootMessenger.delegate({
    events: ['KycController:verificationStatusChanged'],
    messenger,
  });

  return messenger;
}
