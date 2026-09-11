import { CurrencyRateMessenger } from '@metamask/assets-controllers';
import { RootMessenger } from '../../types';
import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';

/**
 * Get the CurrencyRateMessenger for the CurrencyRateController.
 *
 * @param rootMessenger - The root messenger.
 * @returns The CurrencyRateMessenger.
 */
export function getCurrencyRateControllerMessenger(
  rootMessenger: RootMessenger<
    MessengerActions<CurrencyRateMessenger>,
    MessengerEvents<CurrencyRateMessenger>
  >,
): CurrencyRateMessenger {
  const messenger: CurrencyRateMessenger = new Messenger({
    namespace: 'CurrencyRateController',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: [
      'NetworkController:getNetworkClientById',
      'NetworkController:getState',
    ],
    events: [],
    messenger,
  });
  return messenger;
}
