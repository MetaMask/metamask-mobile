import {
  AppState,
  AppStateStatus,
  NativeEventSubscription,
} from 'react-native';
import { BackendWebSocketService } from '@metamask/core-backend';
import Logger from '../util/Logger';

export class AppStateWebSocketManager {
  private appStateSubscription: NativeEventSubscription | null = null;
  private webSocketService: BackendWebSocketService | null = null;

  private _pendingState: AppStateStatus | null = null;
  private _processing = false;

  constructor(webSocketService: BackendWebSocketService) {
    this.webSocketService = webSocketService;
    this.setupAppStateListener();
  }

  private setupAppStateListener(): void {
    this.appStateSubscription = AppState.addEventListener(
      'change',
      this.handleAppStateChange.bind(this),
    );
  }

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

  cleanup(): void {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }

    if (this.webSocketService) {
      this.webSocketService.destroy();
      this.webSocketService = null;
    }
  }

  getWebSocketService(): BackendWebSocketService | null {
    return this.webSocketService;
  }
}
