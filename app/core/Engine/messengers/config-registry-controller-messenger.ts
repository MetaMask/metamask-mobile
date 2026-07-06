import { ConfigRegistryControllerMessenger } from '@metamask/config-registry-controller';
import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import type { RootMessenger } from '../types';

type AllowedActions = MessengerActions<ConfigRegistryControllerMessenger>;

type AllowedEvents = MessengerEvents<ConfigRegistryControllerMessenger>;

/**
 * Get a restricted messenger for the Config Registry controller. This is scoped to the
 * actions and events that the Config Registry controller is allowed to handle.
 *
 * @param messenger - The root controller messenger.
 * @returns The restricted controller messenger.
 */
export function getConfigRegistryControllerMessenger(
  messenger: RootMessenger,
): ConfigRegistryControllerMessenger {
  const controllerMessenger = new Messenger<
    'ConfigRegistryController',
    AllowedActions,
    AllowedEvents,
    RootMessenger
  >({
    namespace: 'ConfigRegistryController',
    parent: messenger,
  });

  messenger.delegate({
    messenger: controllerMessenger,
    actions: [
      'RemoteFeatureFlagController:getState',
      'ConfigRegistryApiService:fetchConfig',
      'KeyringController:getState',
    ],
    events: [
      'RemoteFeatureFlagController:stateChange',
      'KeyringController:unlock',
      'KeyringController:lock',
    ],
  });

  return controllerMessenger;
}
