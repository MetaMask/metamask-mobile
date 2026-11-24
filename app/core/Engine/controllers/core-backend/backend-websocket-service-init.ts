import { BackendWebSocketService } from '@metamask/core-backend';
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
 * @returns The initialized service.
 */
export const backendWebSocketServiceInit: MessengerClientInitFunction<
  BackendWebSocketService,
  BackendWebSocketServiceMessenger,
  BackendWebSocketServiceInitMessenger
> = ({ controllerMessenger }) => {
  Logger.log('Initializing BackendWebSocketService');

  const isBasicFunctionality = () =>
    selectBasicFunctionalityEnabled(store.getState());

  const subscribeToBasicFunctionalityChange = (
    onChange: (isBasic: boolean) => void,
  ) => {
    let previous = isBasicFunctionality();

    return store.subscribe(() => {
      const current = isBasicFunctionality();
      if (current === previous) {
        return;
      }

      previous = current;
      onChange(current);
    });
  };

  const controller = new BackendWebSocketService({
    messenger: controllerMessenger,
    url:
      process.env.MM_BACKEND_WEBSOCKET_URL ||
      'wss://gateway.api.cx.metamask.io/v1',
    // Inject the Sentry-backed trace function from mobile platform
    // @ts-expect-error: Types of `TraceRequest` are not the same.
    traceFn: trace,
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
