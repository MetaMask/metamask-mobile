import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
import type { KycServiceMessenger } from '@metamask/kyc-controller';
import type { RootMessenger } from '../../types';

/**
 * Get the messenger for the KycService.
 *
 * Delegates the external actions the service calls: the wallet bearer token
 * (for authenticated UKYC requests) and geolocation (to resolve the country).
 *
 * @param rootMessenger - The root messenger.
 * @returns The KycServiceMessenger.
 */
export function getKycServiceMessenger(
  rootMessenger: RootMessenger,
): KycServiceMessenger {
  const messenger = new Messenger<
    'KycService',
    MessengerActions<KycServiceMessenger>,
    MessengerEvents<KycServiceMessenger>,
    RootMessenger
  >({
    namespace: 'KycService',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: [
      'AuthenticationController:getBearerToken',
      'GeolocationController:getGeolocation',
    ],
    messenger,
  });
  return messenger;
}
