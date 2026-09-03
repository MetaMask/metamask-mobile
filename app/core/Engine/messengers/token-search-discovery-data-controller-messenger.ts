import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import { TokenSearchDiscoveryDataControllerMessenger } from '@metamask/assets-controllers';
import { RootMessenger } from '../types';

export function getTokenSearchDiscoveryDataControllerMessenger(
  rootMessenger: RootMessenger<
    MessengerActions<TokenSearchDiscoveryDataControllerMessenger>,
    MessengerEvents<TokenSearchDiscoveryDataControllerMessenger>
  >,
): TokenSearchDiscoveryDataControllerMessenger {
  const messenger: TokenSearchDiscoveryDataControllerMessenger = new Messenger({
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
