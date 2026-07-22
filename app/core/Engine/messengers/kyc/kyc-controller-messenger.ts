import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
import type { KycControllerMessenger } from '@metamask/kyc-controller';
import type { RootMessenger } from '../../types';

/**
 * Get the messenger for the KycController.
 *
 * Delegates the KycService actions so the controller can call the service
 * through the messenger.
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
    actions: [
      'KycService:getGeoCountry',
      'KycService:fetchDisclaimers',
      'KycService:createSession',
      'KycService:checkKycRequired',
      'KycService:createUkycSession',
      'KycService:submitWrappedKey',
    ],
    messenger,
  });
  return messenger;
}
