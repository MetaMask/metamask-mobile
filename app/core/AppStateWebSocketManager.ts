import {
  AppState,
  AppStateStatus,
  NativeEventSubscription,
} from 'react-native';
import { BackendWebSocketService } from '@metamask/core-backend';
import Logger from '../util/Logger';

/**
 * AppStateWebSocketManager handles WebSocket lifecycle based on React Native app state changes.
 * This provides proper mobile optimization by disconnecting WebSocket connections when the app
 * goes to background and reconnecting when it returns to foreground.
 */
export class AppStateWebSocketManager {
  private appStateSubscription: NativeEventSubscription | null = null;
  private webSocketService: BackendWebSocketService | null = null;

  // Rapid state changes (background→active→background faster than a connect/disconnect
  // resolves) are serialised: only one operation runs at a time and the most-recently
  // requested state is always the one ultimately applied.
  private _pendingState: AppStateStatus | null = null;
  private _processing = false;

  /**
   * Initialize the manager with WebSocket service
   *
   * @param webSocketService - The WebSocket service to manage
   */
  constructor(webSocketService: BackendWebSocketService) {
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
   * Handle app state changes for WebSocket lifecycle management.
   *
   * Non-reentrant: if a connect/disconnect is already in flight, the new state
   * is recorded as pending and processed immediately after the current operation
   * completes. Only the latest pending state is kept — intermediate states that
   * arrive while processing are coalesced so the socket always ends up in the
   * correct final state without concurrent connect/disconnect calls.
   *
   * @param nextAppState - The new app state
   */
  private async handleAppStateChange(
    nextAppState: AppStateStatus,
  ): Promise<void> {
    this._pendingState = nextAppState;
    if (this._processing) return;
    this._processing = true;

    while (this._pendingState !== null) {
      const state = this._pendingState;
      this._pendingState = null;
      await this._applyState(state);
    }

    this._processing = false;
  }

  private async _applyState(state: AppStateStatus): Promise<void> {
    if (!this.webSocketService) return;
    try {
      if (state === 'background') {
        await this.webSocketService.disconnect();
        Logger.log('WebSocket disconnected due to app entering background');
      } else if (state === 'active') {
        await this.webSocketService.connect();
        Logger.log(
          'WebSocket reconnection attempt completed (service handles feature flag check)',
        );
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
  getWebSocketService(): BackendWebSocketService | null {
    return this.webSocketService;
  }
}
