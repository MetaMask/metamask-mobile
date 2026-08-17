import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import { RootMessenger } from '../types';
import { PhishingDataServiceMessenger } from '@metamask/phishing-controller';

/**
 * Create a messenger restricted to the allowed actions and events of the
 * phishing data service. The StorageService actions are required for
 * persisting the service's query cache between sessions.
 *
 * @param rootMessenger - The root messenger.
 * @returns The service messenger.
 */
export function getPhishingDataServiceMessenger(
  rootMessenger: RootMessenger<
    MessengerActions<PhishingDataServiceMessenger>,
    MessengerEvents<PhishingDataServiceMessenger>
  >,
): PhishingDataServiceMessenger {
  const messenger: PhishingDataServiceMessenger = new Messenger({
    namespace: 'PhishingDataService',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: [
      'StorageService:getItem',
      'StorageService:setItem',
      'StorageService:removeItem',
    ],
    messenger,
  });
  return messenger;
}
