import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import { RootMessenger } from '../types';
import { PhishingControllerMessenger } from '@metamask/phishing-controller';

export function getPhishingControllerMessenger(
  rootMessenger: RootMessenger,
): PhishingControllerMessenger {
  const messenger = new Messenger<
    'PhishingController',
    MessengerActions<PhishingControllerMessenger>,
    MessengerEvents<PhishingControllerMessenger>,
    RootMessenger
  >({
    namespace: 'PhishingController',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: [],
    events: ['TransactionController:stateChange'],
    messenger,
  });
  return messenger;
}
