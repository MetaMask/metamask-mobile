import { Messenger } from '@metamask/base-controller';

type AllowedActions = never;

type AllowedEvents = never;

export type RemoteFeatureFlagControllerMessenger = ReturnType<
  typeof getRemoteFeatureFlagControllerMessenger
>;

/**
 * Get a messenger restricted to the actions and events that the
 * remote feature flag controller is allowed to handle.
 *
 * @param messenger - The controller messenger to restrict.
 * @returns The restricted controller messenger.
 */
export function getRemoteFeatureFlagControllerMessenger(
  messenger: Messenger<AllowedActions, AllowedEvents>,
) {
  return messenger.getRestricted({
    name: 'RemoteFeatureFlagController',
    allowedActions: [],
    allowedEvents: [],
  });
}
