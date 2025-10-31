import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import { TokenSearchDiscoveryDataControllerMessenger } from '@metamask/assets-controllers';
import { RootMessenger } from '../types';

export function getTokenSearchDiscoveryDataControllerMessenger(
  rootMessenger: RootMessenger,
): TokenSearchDiscoveryDataControllerMessenger {
  const messenger = new Messenger<
    'TokenSearchDiscoveryDataController',
    MessengerActions<TokenSearchDiscoveryDataControllerMessenger>,
    MessengerEvents<TokenSearchDiscoveryDataControllerMessenger>,
    RootMessenger
  >({
    namespace: 'TokenSearchDiscoveryDataController',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: ['CurrencyRateController:getState'],
    events: [],
    messenger,
  });
  return messenger;
}
