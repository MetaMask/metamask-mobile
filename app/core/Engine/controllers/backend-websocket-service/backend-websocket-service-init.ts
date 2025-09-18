import {
  WebSocketService,
  type WebSocketServiceMessenger,
} from '@metamask/backend-platform';
import { ControllerInitFunction } from '../../types';
import Logger from '../../../../util/Logger';

/**
 * Initialize the Backend WebSocket service.
 * This provides WebSocket connectivity for backend platform services
 * like AccountActivityService and other platform-level integrations.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the service.
 * @returns The initialized service.
 */
export const backendWebSocketServiceInit: ControllerInitFunction<
  WebSocketService,
  WebSocketServiceMessenger
> = ({ controllerMessenger }) => {
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
    });

    // Explicitly connect the WebSocket service after creation
    // Since we removed auto-initialization from the constructor
    controller.connect().catch((error) => {
      Logger.error(
        error as Error,
        '[WebSocketService] Failed to connect during initialization',
      );
      // Don't throw here - let the service handle reconnection logic
      // The app should continue to work without WebSocket connectivity
    });

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
