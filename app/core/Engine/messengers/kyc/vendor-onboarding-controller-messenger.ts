import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
import type { VendorOnboardingControllerMessenger } from '@metamask/kyc-controller';
import type { RootMessenger } from '../../types';

/**
 * Actions {@link VendorOnboardingController} calls on other messengers: the
 * `KycService` requests it makes for each step, and Profile Sync storage for
 * the UKYC local user secret.
 */
const VENDOR_ONBOARDING_CONTROLLER_DELEGATED_ACTIONS = [
  'KycService:getStep',
  'KycService:acceptVendorTerms',
  'KycService:markProviderSubmitted',
  'KycService:postOnboardingStep',
  'KycService:getGeoCountry',
  'KycService:getSessionStatusForVendor',
  'KycService:createUkycSession',
  'KycService:resetWrappingKeys',
  'KycService:setAuthorizations',
  'KycService:fetchIdosEnclaveJwks',
  'KycService:fetchIdosRelayJwks',
  'KycService:fetchSessionDisclaimersBySessionId',
  'KycService:submitSessionDisclaimers',
  'KycService:createJourney',
  'UserStorageController:performGetStorage',
  'UserStorageController:performSetStorage',
] as const;

/**
 * Get the messenger for the VendorOnboardingController.
 *
 * @param rootMessenger - The root messenger.
 * @returns The VendorOnboardingControllerMessenger.
 */
export function getVendorOnboardingControllerMessenger(
  rootMessenger: RootMessenger,
): VendorOnboardingControllerMessenger {
  const messenger = new Messenger<
    'VendorOnboardingController',
    MessengerActions<VendorOnboardingControllerMessenger>,
    MessengerEvents<VendorOnboardingControllerMessenger>,
    RootMessenger
  >({
    namespace: 'VendorOnboardingController',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: [...VENDOR_ONBOARDING_CONTROLLER_DELEGATED_ACTIONS],
    messenger,
  });
  return messenger;
}
