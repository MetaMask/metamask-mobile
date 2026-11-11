import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
import type { KycFlowControllerMessenger } from '@metamask/kyc-controller';
import type { RootMessenger } from '../../types';

/**
 * Actions {@link KycFlowController} calls on other messengers: the
 * `KycService` requests it makes for each step, and Profile Sync storage for
 * the UKYC local user secret.
 */
const KYC_FLOW_CONTROLLER_DELEGATED_ACTIONS = [
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
 * Get the messenger for the KycFlowController.
 *
 * @param rootMessenger - The root messenger.
 * @returns The KycFlowControllerMessenger.
 */
export function getKycFlowControllerMessenger(
  rootMessenger: RootMessenger,
): KycFlowControllerMessenger {
  const messenger = new Messenger<
    'KycFlowController',
    MessengerActions<KycFlowControllerMessenger>,
    MessengerEvents<KycFlowControllerMessenger>,
    RootMessenger
  >({
    namespace: 'KycFlowController',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: [...KYC_FLOW_CONTROLLER_DELEGATED_ACTIONS],
    messenger,
  });
  return messenger;
}
