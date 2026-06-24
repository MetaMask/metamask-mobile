import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import {
  NetworkControllerMessenger,
  NetworkControllerRpcEndpointDegradedEvent,
  NetworkControllerRpcEndpointUnavailableEvent,
} from '@metamask/network-controller';
import {
  RemoteFeatureFlagControllerGetStateAction,
  RemoteFeatureFlagControllerState,
} from '@metamask/remote-feature-flag-controller';
import { RootMessenger } from '../types';
import { ControllerStateChangeEvent } from '@metamask/base-controller';
import { AnalyticsControllerActions } from '@metamask/analytics-controller';

/**
 * Get the messenger for the network controller. This is scoped to the
 * actions and events that the network controller is allowed to handle.
 *
 * @param rootMessenger - The root messenger.
 * @returns The NetworkControllerMessenger.
 */
export function getNetworkControllerMessenger(
  rootMessenger: RootMessenger<
    MessengerActions<NetworkControllerMessenger>,
    MessengerEvents<NetworkControllerMessenger>
  >,
): NetworkControllerMessenger {
  const messenger: NetworkControllerMessenger = new Messenger({
    namespace: 'NetworkController',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: [
      'ConnectivityController:getState',
      'RemoteFeatureFlagController:getState',
    ],
    events: ['RemoteFeatureFlagController:stateChange'],
    messenger,
  });
  return messenger;
}

type AllowedInitializationActions =
  | RemoteFeatureFlagControllerGetStateAction
  | AnalyticsControllerActions;

type AllowedInitializationEvents =
  | NetworkControllerRpcEndpointDegradedEvent
  | NetworkControllerRpcEndpointUnavailableEvent
  | ControllerStateChangeEvent<
      'RemoteFeatureFlagController',
      RemoteFeatureFlagControllerState
    >;

export type NetworkControllerInitMessenger = Messenger<
  'NetworkControllerInit',
  AllowedInitializationActions,
  AllowedInitializationEvents
>;

/**
 * Get the messenger for the network controller initialization. This is scoped to the
 * actions and events that the network controller is allowed to handle during
 * initialization.
 *
 * @param rootMessenger - The root messenger.
 * @returns The NetworkControllerInitMessenger.
 */
export function getNetworkControllerInitMessenger(
  rootMessenger: RootMessenger<
    MessengerActions<NetworkControllerInitMessenger>,
    MessengerEvents<NetworkControllerInitMessenger>
  >,
): NetworkControllerInitMessenger {
  const messenger: NetworkControllerInitMessenger = new Messenger({
    namespace: 'NetworkControllerInit',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: ['AnalyticsController:trackEvent'],
    events: [
      'NetworkController:rpcEndpointDegraded',
      'NetworkController:rpcEndpointUnavailable',
    ],
    messenger,
  });
  return messenger;
}
