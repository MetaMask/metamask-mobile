import { ControllerStateChangeEvent } from '@metamask/base-controller/next';
import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
import {
  CurrencyRateController,
  CurrencyRateMessenger,
} from '@metamask/assets-controllers';
import { RootMessenger } from '../types';

/**
 * Get the CurrencyRateMessenger for the CurrencyRateController.
 * rates controller is allowed to handle.
 *
 * @param rootMessenger - The root messenger.
 * @returns The CurrencyRateMessenger.
 */
export function getRatesControllerMessenger(
  rootMessenger: RootMessenger,
): CurrencyRateMessenger {
  const messenger = new Messenger<
    'RatesController',
    MessengerActions<CurrencyRateMessenger>,
    MessengerEvents<CurrencyRateMessenger>,
    RootMessenger
  >({
    namespace: 'RatesController',
    parent: rootMessenger,
  });
  return messenger;
}

type AllowedInitializationEvents = ControllerStateChangeEvent<
  'CurrencyRateController',
  CurrencyRateController['state']
>;

export type RatesControllerInitMessenger = ReturnType<
  typeof getRatesControllerInitMessenger
>;

/**
 * Get the messenger for the rates controller initialization. This is scoped to the
 * actions and events that the rates controller is allowed to handle during
 * initialization.
 *
 * @param rootMessenger - The root messenger.
 * @returns The RatesControllerInitMessenger.
 */
export function getRatesControllerInitMessenger(rootMessenger: RootMessenger) {
  const messenger = new Messenger<
    'RatesControllerInitialization',
    never,
    AllowedInitializationEvents,
    RootMessenger
  >({
    namespace: 'RatesControllerInitialization',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: [],
    events: ['CurrencyRateController:stateChange'],
    messenger,
  });
  return messenger;
}
