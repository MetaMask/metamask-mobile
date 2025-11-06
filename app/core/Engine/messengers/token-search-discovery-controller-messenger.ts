import { Messenger } from '@metamask/base-controller';

export type TokenSearchDiscoveryControllerMessenger = ReturnType<
  typeof getTokenSearchDiscoveryControllerMessenger
>;

/**
 * Get a messenger restricted to the actions and events that the
 * token search discovery controller is allowed to handle.
 *
 * @param messenger - The controller messenger to restrict.
 * @returns The restricted controller messenger.
 */
export function getTokenSearchDiscoveryControllerMessenger(
  messenger: Messenger<never, never>,
) {
  return messenger.getRestricted({
    name: 'TokenSearchDiscoveryController',
    allowedActions: [],
    allowedEvents: [],
  });
}
