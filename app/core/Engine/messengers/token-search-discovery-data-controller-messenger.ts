import { ControllerGetStateAction, Messenger } from '@metamask/base-controller';
import { CurrencyRateController } from '@metamask/assets-controllers';

type AllowedActions = ControllerGetStateAction<
  'CurrencyRateController',
  CurrencyRateController['state']
>;

export type TokenSearchDiscoveryDataControllerMessenger = ReturnType<
  typeof getTokenSearchDiscoveryDataControllerMessenger
>;

/**
 * Get a messenger restricted to the actions and events that the
 * token search discovery data controller is allowed to handle.
 *
 * @param messenger - The controller messenger to restrict.
 * @returns The restricted controller messenger.
 */
export function getTokenSearchDiscoveryDataControllerMessenger(
  messenger: Messenger<AllowedActions, never>,
) {
  return messenger.getRestricted({
    name: 'TokenSearchDiscoveryDataController',
    allowedActions: ['CurrencyRateController:getState'],
    allowedEvents: [],
  });
}
