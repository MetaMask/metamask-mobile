import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import { RootMessenger } from '../types';
import { PhishingControllerMessenger } from '@metamask/phishing-controller';

export function getPhishingControllerMessenger(
  rootMessenger: RootMessenger<
    MessengerActions<PhishingControllerMessenger>,
    MessengerEvents<PhishingControllerMessenger>
  >,
): PhishingControllerMessenger {
  const messenger: PhishingControllerMessenger = new Messenger({
    namespace: 'PhishingController',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: [
      'AddressBookController:getState',
      'TransactionController:getState',
    ],
    events: [
      'AddressBookController:stateChange',
      'TransactionController:stateChange',
    ],
    messenger,
  });
  return messenger;
}
