/*
  AppStateAwareWebSocketClient
  - Wraps CoreWebSocketClient to automatically manage connection based on React Native AppState
  - Foreground (active): ensure connected
  - Background: disconnect
  - Provides simple start/stop lifecycle and pass-through send
*/

import { AppState, AppStateStatus } from 'react-native';
import { EventEmitter2 } from 'eventemitter2';
import CoreWebSocketClient, {
  CoreWebSocketClientOptions,
  WebSocketClientState,
} from './CoreWebSocketClient';

export type AppStateAwareOptions = CoreWebSocketClientOptions & {
  connectInBackground?: boolean; // if true, keep connection even in background
};

export type AppStateAwareEvents = {
  state: [state: WebSocketClientState, appState: AppStateStatus];
  open: [];
  close: [code: number, reason: string];
  error: [error: Error];
  message: [data: any];
  'heartbeat:ping': [];
  'heartbeat:pong': [];
  'heartbeat:timeout': [];
};

type EventKey = keyof AppStateAwareEvents;

export class AppStateAwareWebSocketClient {
  private readonly options: Required<AppStateAwareOptions>;
  private readonly client: CoreWebSocketClient;
  private readonly emitter = new EventEmitter2();

  private appStateSubscription: ReturnType<
    typeof AppState.addEventListener
  > | null = null;
  private currentAppState: AppStateStatus = AppState.currentState;
  private started = false;

  constructor(options: AppStateAwareOptions) {
    const { connectInBackground = false, ...clientOptions } = options;
    this.options = {
      connectInBackground,
      ...clientOptions,
    } as Required<AppStateAwareOptions>;
    this.client = new CoreWebSocketClient(clientOptions);

    // proxy events
    this.client.on('state', (state) =>
      this.emitter.emit('state', state, this.currentAppState),
    );
    this.client.on('open', () => this.emitter.emit('open'));
    this.client.on('close', (code, reason) =>
      this.emitter.emit('close', code, reason),
    );
    this.client.on('error', (error) => this.emitter.emit('error', error));
    this.client.on('message', (data) => this.emitter.emit('message', data));
    this.client.on('heartbeat:ping', () => this.emitter.emit('heartbeat:ping'));
    this.client.on('heartbeat:pong', () => this.emitter.emit('heartbeat:pong'));
    this.client.on('heartbeat:timeout', () =>
      this.emitter.emit('heartbeat:timeout'),
    );
  }

  on<K extends EventKey>(
    event: K,
    listener: (...args: AppStateAwareEvents[K]) => void,
  ) {
    this.emitter.on(event, listener);
    return () => this.emitter.off(event, listener);
  }

  start() {
    if (this.started) return;
    this.started = true;
    this.appStateSubscription = AppState.addEventListener(
      'change',
      this.handleAppStateChange,
    );
    // Initial sync
    this.syncConnectionForState(this.currentAppState).catch(() => {});
  }

  stop() {
    if (!this.started) return;
    this.started = false;
    this.appStateSubscription?.remove();
    this.appStateSubscription = null;
    void this.client.disconnect();
  }

  async send(data: any) {
    this.client.send(data);
  }

  private handleAppStateChange = (next: AppStateStatus) => {
    if (this.currentAppState === next) return;
    const prev = this.currentAppState;
    this.currentAppState = next;
    void this.syncConnectionForState(next);
  };

  private async syncConnectionForState(state: AppStateStatus) {
    if (state === 'active') {
      await this.client.connect();
      return;
    }
    if (!this.options.connectInBackground) {
      await this.client.disconnect();
    }
  }
}

export default AppStateAwareWebSocketClient;
