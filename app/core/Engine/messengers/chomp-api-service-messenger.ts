import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
import type { ChompApiServiceMessenger } from '@metamask/chomp-api-service';
import type { RemoteFeatureFlagControllerGetStateAction } from '@metamask/remote-feature-flag-controller';
import type { RootMessenger } from '../types';

/**
 * Get the messenger for the CHOMP API service. This is scoped to the
 * actions and events that the CHOMP API service is allowed to handle.
 *
 * @param rootMessenger - The root messenger.
 * @returns The ChompApiServiceMessenger.
 */
export function getChompApiServiceMessenger(
  rootMessenger: RootMessenger<
    MessengerActions<ChompApiServiceMessenger>,
    MessengerEvents<ChompApiServiceMessenger>
  >,
): ChompApiServiceMessenger {
  const messenger: ChompApiServiceMessenger = new Messenger({
    namespace: 'ChompApiService',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: ['AuthenticationController:getBearerToken'],
    events: [],
    messenger,
  });
  return messenger;
}

type AllowedInitializationActions = RemoteFeatureFlagControllerGetStateAction;

export type ChompApiServiceInitMessenger = Messenger<
  'ChompApiServiceInitialization',
  AllowedInitializationActions,
  never
>;

/**
 * Get a messenger restricted to the actions and events that the
 * CHOMP API service initialization is allowed to handle.
 *
 * @param rootMessenger - The root messenger.
 * @returns The restricted init messenger.
 */
export function getChompApiServiceInitMessenger(
  rootMessenger: RootMessenger<
    MessengerActions<ChompApiServiceInitMessenger>,
    MessengerEvents<ChompApiServiceInitMessenger>
  >,
): ChompApiServiceInitMessenger {
  const messenger: ChompApiServiceInitMessenger = new Messenger({
    namespace: 'ChompApiServiceInitialization',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: ['RemoteFeatureFlagController:getState'],
    events: [],
    messenger,
  });
  return messenger;
}
