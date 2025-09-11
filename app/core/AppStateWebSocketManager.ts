import {
  AppState,
  AppStateStatus,
  NativeEventSubscription,
} from 'react-native';
import { WebSocketService } from '@metamask/backend-platform';
import Logger from '../util/Logger';

/**
 * AppStateWebSocketManager handles WebSocket lifecycle based on React Native app state changes.
 * This provides proper mobile optimization by disconnecting WebSocket connections when the app
 * goes to background and reconnecting when it returns to foreground.
 */
export class AppStateWebSocketManager {
  private appStateSubscription: NativeEventSubscription | null = null;
  private webSocketService: WebSocketService | null = null;

  /**
   * Initialize the manager with WebSocket service
   *
   * @param webSocketService - The WebSocket service to manage
   */
  constructor(webSocketService: WebSocketService) {
    this.webSocketService = webSocketService;
    this.setupAppStateListener();
  }

  /**
   * Setup the app state listener to handle WebSocket lifecycle
   */
  private setupAppStateListener(): void {
    this.appStateSubscription = AppState.addEventListener(
      'change',
      this.handleAppStateChange.bind(this),
    );
  }

  /**
   * Handle app state changes for WebSocket lifecycle management
   *
   * @param nextAppState - The new app state
   */
  private async handleAppStateChange(
    nextAppState: AppStateStatus,
  ): Promise<void> {
    if (!this.webSocketService) {
      return;
    }

    try {
      if (nextAppState === 'background') {
        // Disconnect WebSocket when app goes to background to save resources
        await this.webSocketService.disconnect();
        Logger.log('WebSocket disconnected due to app entering background');
      } else if (nextAppState === 'active') {
        // Reconnect WebSocket when app becomes active
        await this.webSocketService.connect();
        Logger.log('WebSocket reconnected due to app becoming active');
      }
    } catch (error) {
      Logger.error(
        error as Error,
        'Error handling WebSocket lifecycle on app state change',
      );
    }
  }

  /**
   * Cleanup the manager and remove listeners
   */
  cleanup(): void {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }

    // Cleanup WebSocket connection
    if (this.webSocketService) {
      // Call destroy() to follow the standard controller pattern
      this.webSocketService.destroy();
      this.webSocketService = null;
    }
  }

  /**
   * Get the current WebSocket service
   *
   * @returns The WebSocket service instance
   */
  getWebSocketService(): WebSocketService | null {
    return this.webSocketService;
  }

  /**
   * Update the WebSocket service being managed
   *
   * @param webSocketService - The new WebSocket service to manage
   */
  updateWebSocketService(webSocketService: WebSocketService): void {
    // Cleanup existing service if any
    if (this.webSocketService) {
      this.webSocketService.disconnect().catch((error) => {
        Logger.error(
          error as Error,
          'Error disconnecting previous WebSocket service',
        );
      });
    }

    this.webSocketService = webSocketService;
  }
}
