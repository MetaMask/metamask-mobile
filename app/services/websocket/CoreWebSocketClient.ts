/*
  CoreWebSocketClient
  - Minimal, extensible WebSocket client for React Native feature teams
  - Provides: connect/disconnect/send, automatic heartbeat with timeout handling,
    optional auto-reconnect with backoff, and an event-based API

  Notes:
  - This class is UI-agnostic and has no AppState logic. See AppStateAwareWebSocketClient
    for lifecycle-driven connect/disconnect.
*/

import { EventEmitter2 } from 'eventemitter2';

export type WebSocketLike = Pick<
  WebSocket,
  | 'onopen'
  | 'onclose'
  | 'onerror'
  | 'onmessage'
  | 'close'
  | 'send'
  | 'readyState'
> & { addEventListener?: WebSocket['addEventListener'] };

export enum WebSocketClientState {
  Idle = 'idle',
  Connecting = 'connecting',
  Open = 'open',
  Closing = 'closing',
  Closed = 'closed',
}

export type HeartbeatConfig = {
  heartbeatIntervalMs?: number; // How often to ping
  heartbeatTimeoutMs?: number; // How long to wait for pong before considering dead
  makePingMessage?: () => any; // Message to send for ping
  isPongMessage?: (data: any) => boolean; // Detect if a message is a pong
};

export type ReconnectBackoff = {
  initialMs?: number; // initial backoff
  maxMs?: number; // max cap
  multiplier?: number; // exponential multiplier
  jitterRatio?: number; // add +/- jitter percentage (0-1)
};

export type CoreWebSocketClientOptions = {
  url: string | (() => string);
  protocols?: string | string[];
  connectTimeoutMs?: number;
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
  backoff?: ReconnectBackoff;
  heartbeat?: HeartbeatConfig;
  logger?: Pick<Console, 'log' | 'warn' | 'error'>;
};

export type CoreWebSocketClientEvents = {
  open: [];
  close: [code: number, reason: string];
  error: [error: Error];
  message: [data: any];
  reconnecting: [attempt: number, delayMs: number];
  reconnected: [attempt: number];
  'heartbeat:ping': [];
  'heartbeat:pong': [];
  'heartbeat:timeout': [];
  state: [state: WebSocketClientState];
};

type EventKey = keyof CoreWebSocketClientEvents;

export class CoreWebSocketClient {
  private readonly options: Required<CoreWebSocketClientOptions>;
  private readonly heartbeatOptions: Required<HeartbeatConfig>;
  private readonly backoffOptions: Required<ReconnectBackoff>;
  private socket: WebSocketLike | null = null;
  private stateInternal: WebSocketClientState = WebSocketClientState.Idle;
  private emitter = new EventEmitter2();
  private connectAbortController: AbortController | null = null;

  private heartbeatIntervalId: ReturnType<typeof setInterval> | null = null;
  private heartbeatTimeoutId: ReturnType<typeof setTimeout> | null = null;

  private reconnectAttempts = 0;
  private manualDisconnect = false;

  constructor(options: CoreWebSocketClientOptions) {
    const defaultHeartbeat: Required<HeartbeatConfig> = {
      heartbeatIntervalMs: 25_000,
      heartbeatTimeoutMs: 10_000,
      makePingMessage: () => ({ type: 'ping', ts: Date.now() }),
      isPongMessage: (data: any) =>
        Boolean(data && typeof data === 'object' && data.type === 'pong'),
    };

    const defaultBackoff: Required<ReconnectBackoff> = {
      initialMs: 1_000,
      maxMs: 30_000,
      multiplier: 2,
      jitterRatio: 0.2,
    };

    const {
      url,
      protocols,
      connectTimeoutMs = 10_000,
      autoReconnect = true,
      maxReconnectAttempts = 10,
      backoff = {},
      heartbeat = {},
      logger,
    } = options;

    this.options = {
      url,
      protocols,
      connectTimeoutMs,
      autoReconnect,
      maxReconnectAttempts,
      backoff: { ...defaultBackoff, ...backoff },
      heartbeat: { ...defaultHeartbeat, ...heartbeat },
      logger: logger ?? console,
    } as Required<CoreWebSocketClientOptions>;

    this.heartbeatOptions = {
      ...defaultHeartbeat,
      ...heartbeat,
    } as Required<HeartbeatConfig>;
    this.backoffOptions = {
      ...defaultBackoff,
      ...backoff,
    } as Required<ReconnectBackoff>;
  }

  on<K extends EventKey>(
    event: K,
    listener: (...args: CoreWebSocketClientEvents[K]) => void,
  ) {
    this.emitter.on(event, listener);
    return () => this.emitter.off(event, listener);
  }

  once<K extends EventKey>(
    event: K,
    listener: (...args: CoreWebSocketClientEvents[K]) => void,
  ) {
    this.emitter.once(event, listener);
    return () => this.emitter.off(event, listener);
  }

  off<K extends EventKey>(
    event: K,
    listener: (...args: CoreWebSocketClientEvents[K]) => void,
  ) {
    this.emitter.off(event, listener);
  }

  get state(): WebSocketClientState {
    return this.stateInternal;
  }

  isOpen(): boolean {
    return this.stateInternal === WebSocketClientState.Open;
  }

  async connect(): Promise<void> {
    if (
      this.socket ||
      this.stateInternal === WebSocketClientState.Open ||
      this.stateInternal === WebSocketClientState.Connecting
    ) {
      return;
    }

    this.manualDisconnect = false;
    this.setState(WebSocketClientState.Connecting);

    const url =
      typeof this.options.url === 'function'
        ? this.options.url()
        : this.options.url;

    // In React Native, the global WebSocket is available
    const socket = new WebSocket(url, this.options.protocols);
    this.socket = socket;
    this.connectAbortController = new AbortController();

    const cleanupConnectTimeout = this.setupConnectTimeout();

    socket.onopen = () => {
      cleanupConnectTimeout();
      this.reconnectAttempts = 0;
      this.setState(WebSocketClientState.Open);
      this.emitter.emit('open');
      this.startHeartbeat();
    };

    type RNMessageEvent = { data: any };
    socket.onmessage = (event: RNMessageEvent) => {
      const data = this.safeParse(event.data);
      // Heartbeat detection
      if (this.heartbeatOptions.isPongMessage(data)) {
        this.cancelHeartbeatTimeout();
        this.emitter.emit('heartbeat:pong');
      }
      this.emitter.emit('message', data);
    };

    socket.onerror = () => {
      // Error details are platform-dependent; close will follow
      this.emitter.emit('error', new Error('WebSocket error'));
    };

    type RNCloseEvent = { code: number; reason: string };
    socket.onclose = (event: RNCloseEvent) => {
      cleanupConnectTimeout();
      this.stopHeartbeat();
      this.setState(WebSocketClientState.Closed);
      this.emitter.emit('close', event.code, event.reason);
      this.socket = null;

      if (!this.manualDisconnect && this.options.autoReconnect) {
        this.scheduleReconnect();
      }
    };
  }

  async disconnect(code?: number, reason?: string): Promise<void> {
    this.manualDisconnect = true;
    this.cancelReconnect();
    this.stopHeartbeat();
    this.setState(WebSocketClientState.Closing);
    this.connectAbortController?.abort();
    this.connectAbortController = null;

    if (this.socket) {
      try {
        this.socket.close(code, reason);
      } catch {
        // no-op
      }
    }
    this.socket = null;
    this.setState(WebSocketClientState.Closed);
  }

  send(data: any): void {
    if (!this.socket || this.stateInternal !== WebSocketClientState.Open) {
      throw new Error('WebSocket is not open');
    }
    try {
      const payload = typeof data === 'string' ? data : JSON.stringify(data);
      this.socket.send(payload as any);
    } catch (err) {
      this.options.logger.warn?.('Failed to send over WebSocket', err);
      throw err;
    }
  }

  // ----- Internals -----

  private setState(next: WebSocketClientState) {
    if (this.stateInternal !== next) {
      this.stateInternal = next;
      this.emitter.emit('state', next);
    }
  }

  private safeParse(raw: any) {
    if (typeof raw !== 'string') return raw;
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }

  private setupConnectTimeout() {
    const controller = this.connectAbortController;
    if (!controller) return () => {};

    const timeoutId = setTimeout(() => {
      if (this.stateInternal === WebSocketClientState.Connecting) {
        this.options.logger.warn?.('WebSocket connect timeout');
        try {
          this.socket?.close();
        } catch {}
      }
    }, this.options.connectTimeoutMs);

    return () => clearTimeout(timeoutId);
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    const { heartbeatIntervalMs } = this.options.heartbeat;
    this.heartbeatIntervalId = setInterval(() => {
      if (!this.isOpen()) return;
      this.emitter.emit('heartbeat:ping');
      try {
        this.send(this.heartbeatOptions.makePingMessage());
      } catch {
        // If send throws, socket is not usable; close will trigger reconnect
        return;
      }
      this.scheduleHeartbeatTimeout();
    }, heartbeatIntervalMs);
  }

  private stopHeartbeat() {
    if (this.heartbeatIntervalId) {
      clearInterval(this.heartbeatIntervalId);
      this.heartbeatIntervalId = null;
    }
    this.cancelHeartbeatTimeout();
  }

  private scheduleHeartbeatTimeout() {
    this.cancelHeartbeatTimeout();
    this.heartbeatTimeoutId = setTimeout(() => {
      this.options.logger.warn?.('WebSocket heartbeat timeout');
      this.emitter.emit('heartbeat:timeout');
      try {
        this.socket?.close();
      } catch {}
    }, this.heartbeatOptions.heartbeatTimeoutMs);
  }

  private cancelHeartbeatTimeout() {
    if (this.heartbeatTimeoutId) {
      clearTimeout(this.heartbeatTimeoutId);
      this.heartbeatTimeoutId = null;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      this.options.logger.warn?.('Max reconnect attempts reached');
      return;
    }
    const delay = this.computeBackoffDelay(this.reconnectAttempts);
    this.reconnectAttempts += 1;
    this.emitter.emit('reconnecting', this.reconnectAttempts, delay);

    this.cancelReconnect();
    this.reconnectTimer = setTimeout(() => {
      this.connect().then(() => {
        if (this.isOpen()) {
          this.emitter.emit('reconnected', this.reconnectAttempts);
        }
      });
    }, delay);
  }

  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  private cancelReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private computeBackoffDelay(attempt: number): number {
    const { initialMs, maxMs, multiplier, jitterRatio } = this.backoffOptions;
    const base = Math.min(maxMs, initialMs * Math.pow(multiplier, attempt));
    const jitter = base * jitterRatio;
    const rand = (Math.random() * 2 - 1) * jitter; // +/- jitter
    return Math.max(0, Math.floor(base + rand));
  }
}

export default CoreWebSocketClient;
