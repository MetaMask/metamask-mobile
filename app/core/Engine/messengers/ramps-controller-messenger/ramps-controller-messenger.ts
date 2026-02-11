import { RampsControllerMessenger } from '@metamask/ramps-controller';
import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import { RootMessenger } from '../../types';

type AllowedActions = MessengerActions<RampsControllerMessenger>;

type AllowedEvents = MessengerEvents<RampsControllerMessenger>;

/**
 * Get the RampsControllerMessenger for the RampsController.
 *
 * @param rootMessenger - The root messenger.
 * @returns The RampsControllerMessenger.
 */
export function getRampsControllerMessenger(
  rootMessenger: RootMessenger,
): RampsControllerMessenger {
  const messenger = new Messenger<
    'RampsController',
    AllowedActions,
    AllowedEvents,
    typeof rootMessenger
  >({
    namespace: 'RampsController',
    parent: rootMessenger,
  });

  rootMessenger.delegate({
    messenger,
    actions: [
      'RampsService:getGeolocation',
      'RampsService:getCountries',
      'RampsService:getTokens',
      'RampsService:getProviders',
      'RampsService:getPaymentMethods',
      'RampsService:getQuotes',
    ],
    events: [],
  });

  return messenger;
}
