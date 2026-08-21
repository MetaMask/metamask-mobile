import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
import type {
  KycControllerMessenger,
  KycControllerStatusChangedEvent,
} from '@metamask/kyc-controller';
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
      'KycService:createVendorCustomer',
      'KycService:submitConsents',
      'KycService:fetchKycStatus',
      'KycService:getWrappingKey',
      'KycService:fetchJwks',
      'KycService:createUkycSession',
      'KycService:createJourney',
      'KycService:getSessionStatus',
      'UserStorageController:performGetStorage',
      'UserStorageController:performSetStorage',
    ],
    messenger,
  });
  return messenger;
}

export type KycControllerInitMessenger = ReturnType<
  typeof getKycControllerInitMessenger
>;

/**
 * Get the init messenger for the KycController. Scoped to the
 * `KycController:statusChanged` event that the Engine-level Money Account
 * registration / autoramp orchestrator subscribes to.
 *
 * @param rootMessenger - The root messenger.
 * @returns The KycControllerInitMessenger.
 */
export function getKycControllerInitMessenger(rootMessenger: RootMessenger) {
  const messenger = new Messenger<
    'KycControllerInit',
    never,
    KycControllerStatusChangedEvent,
    RootMessenger
  >({
    namespace: 'KycControllerInit',
    parent: rootMessenger,
  });

  rootMessenger.delegate({
    events: ['KycController:statusChanged'],
    messenger,
  });

  return messenger;
}
