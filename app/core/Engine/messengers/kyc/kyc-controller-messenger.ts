import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
import type { KycControllerMessenger } from '@metamask/kyc-controller';
import type { RootMessenger } from '../../types';

/**
 * Actions {@link KycController} calls on other messengers. Matches the
 * package's `AllowedActions` (every `KycService` method plus Profile Sync
 * storage used to persist the UKYC local user secret).
 */
const KYC_CONTROLLER_DELEGATED_ACTIONS = [
  'KycService:getGeoCountry',
  'KycService:fetchVendorDisclaimers',
  'KycService:createSession',
  'KycService:checkKycRequired',
  'KycService:createVendorCustomer',
  'KycService:submitVendorDisclaimers',
  'KycService:fetchSessionDisclaimersByCountry',
  'KycService:fetchSessionDisclaimersBySessionId',
  'KycService:submitSessionDisclaimers',
  'KycService:fetchKycStatus',
  'KycService:fetchIdosEnclaveJwks',
  'KycService:fetchIdosRelayJwks',
  'KycService:createUkycSession',
  'KycService:setAuthorizations',
  'KycService:createJourney',
  'KycService:getSessionStatus',
  'UserStorageController:performGetStorage',
  'UserStorageController:performSetStorage',
] as const;

/**
 * Get the messenger for the KycController.
 *
 * Delegates KycService and UserStorageController actions so the controller
 * can call them through the messenger.
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
