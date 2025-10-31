import {
  ControllerStateChangeEvent,
  Messenger,
} from '@metamask/base-controller';
import { ErrorReportingServiceCaptureExceptionAction } from '@metamask/error-reporting-service';
import {
  NetworkControllerRpcEndpointDegradedEvent,
  NetworkControllerRpcEndpointUnavailableEvent,
} from '@metamask/network-controller';
import {
  RemoteFeatureFlagControllerGetStateAction,
  RemoteFeatureFlagControllerState,
} from '@metamask/remote-feature-flag-controller';

type AllowedActions = ErrorReportingServiceCaptureExceptionAction;

export type NetworkControllerMessenger = ReturnType<
  typeof getNetworkControllerMessenger
>;

/**
 * Get a restricted messenger for the network controller. This is scoped to the
 * actions and events that the network controller is allowed to handle.
 *
 * @param messenger - The messenger to restrict.
 * @returns The restricted messenger.
 */
export function getNetworkControllerMessenger(
  messenger: Messenger<AllowedActions, never>,
) {
  return messenger.getRestricted({
    name: 'NetworkController',
    allowedActions: ['ErrorReportingService:captureException'],
    allowedEvents: [],
  });
}

type AllowedInitializationActions = RemoteFeatureFlagControllerGetStateAction;

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
 * Get a restricted messenger for the network controller. This is scoped to the
 * actions and events that the network controller is allowed to handle during
 * initialization.
 *
 * @param messenger - The messenger to restrict.
 * @returns The restricted messenger.
 */
export function getNetworkControllerInitMessenger(
  messenger: Messenger<
    AllowedInitializationActions,
    AllowedInitializationEvents
  >,
) {
  return messenger.getRestricted({
    name: 'NetworkControllerInit',
    allowedActions: ['RemoteFeatureFlagController:getState'],
    allowedEvents: [
      'NetworkController:rpcEndpointDegraded',
      'NetworkController:rpcEndpointUnavailable',
      'RemoteFeatureFlagController:stateChange',
    ],
  });
}
