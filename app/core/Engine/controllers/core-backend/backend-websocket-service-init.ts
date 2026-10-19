import { BackendWebSocketService } from '@metamask/core-backend';
import { RemoteFeatureFlagControllerState } from '@metamask/remote-feature-flag-controller';
import { MessengerClientInitFunction } from '../../types';
import {
  BackendWebSocketServiceMessenger,
  BackendWebSocketServiceInitMessenger,
} from '../../messengers/core-backend';
import { selectBasicFunctionalityEnabled } from '../../../../selectors/settings';
import { store } from '../../../../store';
import { trace } from '../../../../util/trace';
import Logger from '../../../../util/Logger';

/**
 * Engine clears remote flags when Basic functionality turns off and refetches
 * them asynchronously when it turns back on. A reconnect is ready once that
 * refetch has landed (`cacheTimestamp > 0`) or the websocket flag key itself
 * is present again.
 *
 * @param state - Remote feature flag controller state.
 * @returns Whether `isEnabled` can read a post-clear flag decision.
 */
const isRemoteFeatureFlagReconnectReady = (
  state: RemoteFeatureFlagControllerState | undefined,
): boolean => {
  if (!state) {
    return false;
  }

  if (state.cacheTimestamp > 0) {
    return true;
  }

  const { remoteFeatureFlags } = state;
  return (
    typeof remoteFeatureFlags === 'object' &&
    remoteFeatureFlags !== null &&
    'backendWebSocketConnection' in remoteFeatureFlags
  );
};

/**
 * Initialize the Backend Platform WebSocket service with authentication support.
 * This provides WebSocket connectivity for backend platform services
 * like AccountActivityService and other platform-level integrations.
 *
 * Authentication Flow (simplified with AuthenticationController):
 * 1. Core WebSocketService: Controls WHETHER connections are allowed (AuthenticationController.isSignedIn = yes)
 * 2. App lifecycle: Controls WHEN to connect/disconnect (background = disconnect, foreground = connect)
 * 3. AuthenticationController.isSignedIn includes BOTH wallet unlock + identity provider authentication
 * 4. Fresh bearer tokens retrieved on each connection attempt (getBearerToken checks wallet unlock internally)
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the service.
 * @param request.initMessenger - The messenger for accessing other controllers.
 * @returns The initialized service.
 */
export const backendWebSocketServiceInit: MessengerClientInitFunction<
  BackendWebSocketService,
  BackendWebSocketServiceMessenger,
  BackendWebSocketServiceInitMessenger
> = ({ controllerMessenger, initMessenger }) => {
  Logger.log('Initializing BackendWebSocketService');

  const isBasicFunctionality = () =>
    selectBasicFunctionalityEnabled(store.getState());

  const subscribeToBasicFunctionalityChange = (
    onChange: (isBasic: boolean) => void,
  ) => {
    let previous = isBasicFunctionality();
    let awaitingRemoteFeatureFlags = false;

    const notifyBasicFunctionalityOn = (
      state: RemoteFeatureFlagControllerState | undefined,
    ) => {
      if (!isRemoteFeatureFlagReconnectReady(state)) {
        // Hold the reconnect. connect() would see an empty flag and return
        // without scheduling another attempt while the app stays foregrounded
        // and unlocked.
        awaitingRemoteFeatureFlags = true;
        return;
      }

      awaitingRemoteFeatureFlags = false;
      onChange(true);
    };

    const onRemoteFeatureFlagsChange = (
      state: RemoteFeatureFlagControllerState,
    ) => {
      if (!awaitingRemoteFeatureFlags || !isBasicFunctionality()) {
        return;
      }

      notifyBasicFunctionalityOn(state);
    };

    initMessenger.subscribe(
      'RemoteFeatureFlagController:stateChange',
      onRemoteFeatureFlagsChange,
    );

    const unsubscribeStore = store.subscribe(() => {
      const current = isBasicFunctionality();
      if (current === previous) {
        return;
      }

      previous = current;
      if (!current) {
        awaitingRemoteFeatureFlags = false;
        onChange(false);
        return;
      }

      try {
        notifyBasicFunctionalityOn(
          initMessenger.call('RemoteFeatureFlagController:getState'),
        );
      } catch (error) {
        // A failed read leaves the flag decision unknown. Keep waiting for the
        // refetch event instead of attempting a connect that cannot retry.
        awaitingRemoteFeatureFlags = true;
        Logger.log(
          'BackendWebSocketService: Could not check feature flag, waiting for the refetch before connecting',
          error,
        );
      }
    });

    return () => {
      unsubscribeStore();
      initMessenger.unsubscribe(
        'RemoteFeatureFlagController:stateChange',
        onRemoteFeatureFlagsChange,
      );
    };
  };

  const controller = new BackendWebSocketService({
    messenger: controllerMessenger,
    url:
      process.env.MM_BACKEND_WEBSOCKET_URL ||
      'wss://gateway.api.cx.metamask.io/v1',
    // Inject the Sentry-backed trace function from mobile platform
    // @ts-expect-error: Types of `TraceRequest` are not the same.
    traceFn: trace,
    // Feature flag AND app lifecycle integration
    // Service will check this callback before connecting/reconnecting
    isEnabled: () => {
      if (!isBasicFunctionality()) {
        return false;
      }
      try {
        const remoteFeatureFlagState = initMessenger?.call(
          'RemoteFeatureFlagController:getState',
        );
        const { backendWebSocketConnection } =
          remoteFeatureFlagState?.remoteFeatureFlags || {};

        // The flag can be a bare boolean or a legacy `{ value }` wrapper.
        // Treat both shapes as enabled when the resolved value is truthy.
        if (
          typeof backendWebSocketConnection === 'object' &&
          backendWebSocketConnection !== null &&
          'value' in backendWebSocketConnection
        ) {
          return Boolean(backendWebSocketConnection.value);
        }

        return typeof backendWebSocketConnection === 'boolean'
          ? backendWebSocketConnection
          : false;
      } catch (error) {
        // If feature flag check fails, default to NOT connecting for safer startup
        Logger.log(
          'BackendWebSocketService: Could not check feature flag, defaulting to NOT connect',
          error,
        );
        return false;
      }
    },
    isBasicFunctionality,
    subscribeToBasicFunctionalityChange,
  });

  // Authentication and lock/unlock handling is now managed by the core WebSocket service
  // Core service will automatically connect when wallet is unlocked (no manual connect() needed)

  Logger.log('BackendWebSocketService initialized');

  return {
    controller,
  };
};
