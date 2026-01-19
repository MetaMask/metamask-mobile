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
import type { ConnectivityControllerGetStateAction } from '@metamask/connectivity-controller';
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
  rootMessenger: RootMessenger,
): NetworkControllerMessenger {
  type NetworkControllerActions =
    | MessengerActions<NetworkControllerMessenger>
    | ConnectivityControllerGetStateAction;
  const messenger = new Messenger<
    'NetworkController',
    NetworkControllerActions,
    MessengerEvents<NetworkControllerMessenger>,
    RootMessenger
  >({
    namespace: 'NetworkController',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: ['ConnectivityController:getState'],
    events: [],
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

export type NetworkControllerInitMessenger = ReturnType<
  typeof getNetworkControllerInitMessenger
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
  rootMessenger: RootMessenger,
) {
  const messenger = new Messenger<
    'NetworkControllerInit',
    AllowedInitializationActions,
    AllowedInitializationEvents,
    RootMessenger
  >({
    namespace: 'NetworkControllerInit',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: [
      'RemoteFeatureFlagController:getState',
      'AnalyticsController:trackEvent',
    ],
    events: [
      'NetworkController:rpcEndpointDegraded',
      'NetworkController:rpcEndpointUnavailable',
      'RemoteFeatureFlagController:stateChange',
    ],
    messenger,
  });
  return messenger;
}
