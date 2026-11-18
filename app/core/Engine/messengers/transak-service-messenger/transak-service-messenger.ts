import { TransakServiceMessenger } from '@metamask/ramps-controller';
import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import type { GlobalActions, GlobalEvents, RootMessenger } from '../../types';

type AllowedActions = MessengerActions<TransakServiceMessenger>;

type AllowedEvents = MessengerEvents<TransakServiceMessenger>;

/**
 * Get the TransakServiceMessenger for the TransakService.
 *
 * @param rootMessenger - The root messenger.
 * @returns The TransakServiceMessenger.
 */
export function getTransakServiceMessenger(
  rootMessenger: RootMessenger<AllowedActions, AllowedEvents>,
): TransakServiceMessenger {
  const messenger: TransakServiceMessenger = new Messenger({
    namespace: 'TransakService',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    // `createWidgetUrl` authenticates against the ramps API proxy with the
    // MetaMask bearer token.
    actions: ['AuthenticationController:getBearerToken'],
    events: [],
    messenger,
  });
  return messenger;
}

type InitActionType = 'RemoteFeatureFlagController:getState';

type InitEventType = 'RemoteFeatureFlagController:stateChange';

export type TransakServiceInitMessenger = Messenger<
  'TransakServiceInit',
  Extract<GlobalActions, { type: InitActionType }>,
  Extract<GlobalEvents, { type: InitEventType }>
>;

/**
 * Get the messenger the TransakService init uses to read the partner API key
 * from remote feature flags.
 *
 * @param rootMessenger - The root messenger.
 * @returns The TransakServiceInitMessenger.
 */
export function getTransakServiceInitMessenger(
  rootMessenger: RootMessenger<
    MessengerActions<TransakServiceInitMessenger>,
    MessengerEvents<TransakServiceInitMessenger>
  >,
): TransakServiceInitMessenger {
  const messenger: TransakServiceInitMessenger = new Messenger({
    namespace: 'TransakServiceInit',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: ['RemoteFeatureFlagController:getState'],
    events: ['RemoteFeatureFlagController:stateChange'],
    messenger,
  });
  return messenger;
}
