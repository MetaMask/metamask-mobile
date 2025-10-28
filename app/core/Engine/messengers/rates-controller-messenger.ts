import {
  ControllerStateChangeEvent,
  Messenger,
} from '@metamask/base-controller';
import { CurrencyRateController } from '@metamask/assets-controllers';

export type RatesControllerMessenger = ReturnType<
  typeof getRatesControllerMessenger
>;

/**
 * Get a messenger restricted to the actions and events that the
 * rates controller is allowed to handle.
 *
 * @param messenger - The controller messenger to restrict.
 * @returns The restricted controller messenger.
 */
export function getRatesControllerMessenger(
  messenger: Messenger<never, never>,
) {
  return messenger.getRestricted({
    name: 'RatesController',
    allowedActions: [],
    allowedEvents: [],
  });
}

type AllowedInitializationEvents = ControllerStateChangeEvent<
  'CurrencyRateController',
  CurrencyRateController['state']
>;

export type RatesControllerInitMessenger = ReturnType<
  typeof getRatesControllerInitMessenger
>;

/**
 * Get a messenger restricted to the actions and events that the
 * rates controller initialization is allowed to handle.
 *
 * @param messenger - The controller messenger to restrict.
 * @returns The restricted controller messenger.
 */
export function getRatesControllerInitMessenger(
  messenger: Messenger<never, AllowedInitializationEvents>,
) {
  return messenger.getRestricted({
    name: 'RatesControllerInitialization',
    allowedActions: [],
    allowedEvents: ['CurrencyRateController:stateChange'],
  });
}
