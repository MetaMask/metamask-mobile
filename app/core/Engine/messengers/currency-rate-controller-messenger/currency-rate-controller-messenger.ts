import { CurrencyRateMessenger } from '@metamask/assets-controllers';
import { RootMessenger, RootExtendedMessenger } from '../../types';
import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';

/**
 * Get the CurrencyRateMessenger for the CurrencyRateController.
 *
 * @param baseControllerMessenger - The base controller messenger.
 * @returns The CurrencyRateMessenger.
 */
export function getCurrencyRateControllerMessenger(
  rootExtendedMessenger: RootExtendedMessenger,
): CurrencyRateMessenger {
  const messenger = new Messenger<
    'CurrencyRateController',
    MessengerActions<CurrencyRateMessenger>,
    MessengerEvents<CurrencyRateMessenger>,
    RootMessenger
  >({
    namespace: 'CurrencyRateController',
    parent: rootExtendedMessenger,
  });
  rootExtendedMessenger.delegate({
    actions: [
      'NetworkController:getNetworkClientById',
      'NetworkController:getState',
    ],
    events: [],
    messenger,
  });
  return messenger;
}
