import {
  WebSocketService,
  type WebSocketServiceMessenger,
} from '@metamask/backend-platform';
import { ControllerInitFunction } from '../../types';
import { BackendWebSocketServiceInitMessenger } from '../../messengers/backend-websocket-service-messenger/backend-websocket-service-messenger';
import Logger from '../../../../util/Logger';

/**
 * Initialize the Backend WebSocket service with authentication support.
 * This provides WebSocket connectivity for backend platform services
 * like AccountActivityService and other platform-level integrations.
 * 
 * Authentication Flow (simplified with AuthenticationController):
 * 1. Core WebSocketService: Controls WHETHER connections are allowed (AuthenticationController.isSignedIn = yes)
 * 2. AppStateWebSocketManager: Controls WHEN to connect/disconnect (background = disconnect, foreground = connect)
 * 3. AuthenticationController.isSignedIn includes BOTH wallet unlock + identity provider authentication  
 * 4. Fresh bearer tokens retrieved on each connection attempt (getBearerToken checks wallet unlock internally)
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the service.
 * @param request.initMessenger - The messenger for accessing other controllers.
 * @returns The initialized service.
 */
export const backendWebSocketServiceInit: ControllerInitFunction<
  WebSocketService,
  WebSocketServiceMessenger,
  BackendWebSocketServiceInitMessenger
> = ({ controllerMessenger, initMessenger }) => {
  try {
    const controller = new WebSocketService({
      messenger: controllerMessenger,
      url:
        process.env.METAMASK_BACKEND_WEBSOCKET_URL ||
        'wss://gateway.dev-api.cx.metamask.io/v1',
      // Mobile-optimized configuration
      timeout: 15000, // 15s connection timeout for mobile networks
      reconnectDelay: 1000, // 1s initial reconnect delay
      maxReconnectDelay: 30000, // 30s max reconnect delay for mobile battery optimization
      requestTimeout: 20000, // 20s request timeout for mobile networks
      // Feature flag integration - service will check this callback before connecting/reconnecting
      enabledCallback: () => {
        try {
          // Check for local environment variable override first (for development)
          const envOverride = process.env.BACKEND_WEBSOCKET_CONNECTION_ENABLED;
          if (envOverride !== undefined && envOverride !== null) {
            return envOverride === 'true';
          }
          
          // Fall back to remote feature flag
          const remoteFeatureFlags = initMessenger?.call('RemoteFeatureFlagController:getState');
          return Boolean(remoteFeatureFlags?.remoteFeatureFlags?.backendWebSocketConnectionEnabled);
        } catch (error) {
          // If we can't get feature flags, default to NOT connecting (safer approach)
          Logger.log(
            '[WebSocketService] Could not check feature flags, defaulting to NOT connect:',
            error as Error
          );
          return false;
        }
      },
        // Enable authentication - core service will handle the authentication logic
        // Note: This will show a linting error until @metamask/backend-platform is published with the new enableAuthentication option
        enableAuthentication: true,
    });

    // Authentication and lock/unlock handling is now managed by the core WebSocket service
    // Core service will automatically connect when wallet is unlocked (no manual connect() needed)

    return {
      controller,
    };
  } catch (error) {
    Logger.error(
      error as Error,
      '[WebSocketService] Failed to initialize service',
    );
    throw error;
  }
};
