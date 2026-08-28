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
      'PhishingDataService:getStalelist',
      'PhishingDataService:getHotlistDiffs',
      'PhishingDataService:getC2DomainBlocklist',
      'PhishingDataService:scanUrl',
      'PhishingDataService:bulkScanUrls',
      'PhishingDataService:scanToken',
      'PhishingDataService:bulkScanTokens',
      'PhishingDataService:scanAddress',
      'PhishingDataService:getApprovals',
    ],
    events: [
      'AddressBookController:stateChange',
      'TransactionController:stateChange',
    ],
    messenger,
  });
  return messenger;
}
