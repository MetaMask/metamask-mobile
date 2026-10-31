import type { CryptoPriceUpdate } from '../../types';
import DevLogger from '../../../../../core/SDKConnect/utils/DevLogger';

export const POLYBOLT_WS_URL = 'wss://ws-live-v2.polymarket.com/ws';

const AUTH_CLOSE_CODE = 4001;
const DRAINING_CLOSE_CODE = 4003;
const POLICY_CLOSE_CODE = 4008;
const ABNORMAL_CLOSE_CODE = 1006;
const MAX_AUTH_FRAMES = 8;
const MAX_SUBSCRIPTIONS = 64;
const MAX_BACKOFF_MS = 30_000;
const BASE_BACKOFF_MS = 1_000;

export interface PolyBoltCredentials {
  apiKey: string;
  secret: string;
  passphrase: string;
}

export type PolyBoltChannel = 'price.crypto' | 'price.crypto.twap';

export interface PolyBoltSubscription {
  channel: PolyBoltChannel;
  callerSymbol: string;
  wireSymbol: string;
}

export interface PolyBoltFeedListener {
  onSnapshot: (channel: PolyBoltChannel, updates: CryptoPriceUpdate[]) => void;
  onLive: (channel: PolyBoltChannel, update: CryptoPriceUpdate) => void;
  onConnectionChange: () => void;
}

interface SocketCloseEvent {
  code?: number;
}

/**
 * Converts a caller symbol such as `btc/usd` to the PolyBolt wire symbol `btcusd`.
 *
 * @param callerSymbol - Symbol the app subscribed with.
 * @returns Lowercase wire symbol, or undefined when the symbol is not a USD pair.
 */
export function toPolyboltWireSymbol(callerSymbol: string): string | undefined {
  const [base, quote] = callerSymbol.trim().toLowerCase().split('/');
  if (!base || quote !== 'usd' || !/^[a-z0-9]+$/u.test(base)) {
    return undefined;
  }

  return `${base}usd`;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const parseDecimalPrice = (fullAccuracyValue: unknown): number | undefined => {
  if (
    typeof fullAccuracyValue !== 'string' ||
    fullAccuracyValue.trim() === ''
  ) {
    return undefined;
  }

  const price = Number(fullAccuracyValue);
  return Number.isFinite(price) ? price : undefined;
};

const subscriptionId = (subscription: PolyBoltSubscription): string =>
  `${subscription.channel}|${subscription.wireSymbol}`;

const toFilter = (
  subscription: PolyBoltSubscription,
): { symbol: string; window_seconds?: 60 } =>
  subscription.channel === 'price.crypto.twap'
    ? { symbol: subscription.wireSymbol, window_seconds: 60 }
    : { symbol: subscription.wireSymbol };

/**
 * Authenticated PolyBolt socket for crypto reference prices.
 * The server sends protocol pings. This client does not send a text ping.
 */
export class PolyBoltCryptoFeed {
  private socket: WebSocket | null = null;

  private credentials: PolyBoltCredentials | null = null;

  private subscriptions: PolyBoltSubscription[] = [];

  private authed = false;

  private authBlocked = false;

  private policyBlocked = false;

  private closedByClient = false;

  private reconnectAttempts = 0;

  private authFramesSent = 0;

  private requestSerial = 0;

  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  private authRetryTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly listener: PolyBoltFeedListener;

  constructor(listener: PolyBoltFeedListener) {
    this.listener = listener;
  }

  isConnected(): boolean {
    return this.authed && this.socket?.readyState === WebSocket.OPEN;
  }

  setCredentials(credentials: PolyBoltCredentials): void {
    if (this.sameCredentials(credentials)) {
      return;
    }

    this.credentials = credentials;
    this.authBlocked = false;
    this.authFramesSent = 0;
    if (this.subscriptions.length > 0) {
      this.connect();
    }
  }

  setSubscriptions(subscriptions: PolyBoltSubscription[]): void {
    const previous = this.subscriptions;
    const next = subscriptions.slice(0, MAX_SUBSCRIPTIONS);
    if (subscriptions.length > MAX_SUBSCRIPTIONS) {
      DevLogger.log('PolyBoltCryptoFeed: subscription limit exceeded', {
        requested: subscriptions.length,
        limit: MAX_SUBSCRIPTIONS,
      });
    }

    if (this.policyBlocked && !this.sameSubscriptionSet(previous, next)) {
      this.policyBlocked = false;
    }

    this.subscriptions = next;
    if (next.length === 0) {
      this.disconnect();
      return;
    }

    if (!this.credentials || this.authBlocked) {
      return;
    }

    this.ensureConnected();
    if (this.authed) {
      this.sendSubscriptionDiff(previous, next);
    }
  }

  disconnect(): void {
    this.closedByClient = true;
    this.clearTimers();
    this.closeSocket();
    this.authed = false;
    this.listener.onConnectionChange();
  }

  /**
   * Opens the socket again after the app returns to the foreground.
   * Keeps an authentication or policy block in place.
   */
  reconnect(): void {
    if (
      this.authBlocked ||
      this.policyBlocked ||
      !this.credentials ||
      this.subscriptions.length === 0
    ) {
      return;
    }

    this.reconnectAttempts = 0;
    this.connect();
  }

  private sameCredentials(credentials: PolyBoltCredentials): boolean {
    return (
      this.credentials?.apiKey === credentials.apiKey &&
      this.credentials.secret === credentials.secret &&
      this.credentials.passphrase === credentials.passphrase
    );
  }

  private sameSubscriptionSet(
    left: PolyBoltSubscription[],
    right: PolyBoltSubscription[],
  ): boolean {
    const leftIds = left.map(subscriptionId).sort();
    const rightIds = right.map(subscriptionId).sort();
    return (
      leftIds.length === rightIds.length &&
      leftIds.every((id, index) => id === rightIds[index])
    );
  }

  private ensureConnected(): void {
    if (
      this.socket?.readyState === WebSocket.OPEN ||
      this.socket?.readyState === WebSocket.CONNECTING
    ) {
      return;
    }

    this.connect();
  }

  private connect(): void {
    if (!this.credentials || this.authBlocked || this.policyBlocked) {
      return;
    }

    this.clearTimers();
    this.closeSocket();
    this.authed = false;
    this.authFramesSent = 0;
    this.closedByClient = false;

    try {
      this.socket = new WebSocket(POLYBOLT_WS_URL);
    } catch (error) {
      DevLogger.log('PolyBoltCryptoFeed: failed to open socket', { error });
      this.scheduleReconnect(this.nextBackoffDelay());
      return;
    }

    this.socket.onopen = () => {
      this.reconnectAttempts = 0;
      this.sendAuth();
    };

    this.socket.onmessage = (event: WebSocketMessageEvent) => {
      this.handleMessage(event);
    };

    this.socket.onerror = () => {
      DevLogger.log('PolyBoltCryptoFeed: socket error');
    };

    this.socket.onclose = (event: SocketCloseEvent) => {
      const closedByClient = this.closedByClient;
      this.closedByClient = false;
      this.authed = false;
      this.socket = null;
      this.listener.onConnectionChange();
      if (closedByClient) {
        return;
      }

      this.handleUnexpectedClose(event.code ?? ABNORMAL_CLOSE_CODE);
    };
  }

  private closeSocket(): void {
    const socket = this.socket;
    if (!socket) {
      return;
    }

    socket.onopen = null;
    socket.onmessage = null;
    socket.onerror = null;
    socket.onclose = null;
    this.socket = null;
    if (
      socket.readyState === WebSocket.OPEN ||
      socket.readyState === WebSocket.CONNECTING
    ) {
      socket.close();
    }
  }

  private handleUnexpectedClose(code: number): void {
    if (this.subscriptions.length === 0 || !this.credentials) {
      return;
    }

    if (code === AUTH_CLOSE_CODE) {
      this.authBlocked = true;
      return;
    }

    if (code === POLICY_CLOSE_CODE) {
      this.policyBlocked = true;
      return;
    }

    if (code === DRAINING_CLOSE_CODE) {
      this.scheduleReconnect(Math.floor(Math.random() * 10_001));
      return;
    }

    this.scheduleReconnect(this.nextBackoffDelay());
  }

  private nextBackoffDelay(): number {
    this.reconnectAttempts += 1;
    const exponent = Math.min(this.reconnectAttempts - 1, 5);
    const base = Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * 2 ** exponent);
    const jitter = Math.floor(Math.random() * 1_000);
    return Math.min(MAX_BACKOFF_MS, base + jitter);
  }

  private scheduleReconnect(delayMs: number): void {
    if (this.reconnectTimer || this.authBlocked || this.policyBlocked) {
      return;
    }

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delayMs);
  }

  private clearTimers(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.authRetryTimer) {
      clearTimeout(this.authRetryTimer);
      this.authRetryTimer = null;
    }
  }

  private nextRequestId(prefix: string): string {
    this.requestSerial += 1;
    return `${prefix}${this.requestSerial}`;
  }

  private send(frame: unknown): void {
    if (this.socket?.readyState !== WebSocket.OPEN) {
      return;
    }

    this.socket.send(JSON.stringify(frame));
  }

  private sendAuth(): void {
    if (
      !this.credentials ||
      this.authBlocked ||
      this.authFramesSent >= MAX_AUTH_FRAMES
    ) {
      return;
    }

    this.authFramesSent += 1;
    this.send({
      op: 'auth',
      rid: this.nextRequestId('a'),
      auth: {
        apiKey: this.credentials.apiKey,
        secret: this.credentials.secret,
        passphrase: this.credentials.passphrase,
      },
    });
  }

  private sendSubscriptionDiff(
    previous: PolyBoltSubscription[],
    next: PolyBoltSubscription[],
  ): void {
    const previousIds = new Set(previous.map(subscriptionId));
    const nextIds = new Set(next.map(subscriptionId));
    const removed = previous.filter(
      (subscription) => !nextIds.has(subscriptionId(subscription)),
    );
    const added = next.filter(
      (subscription) => !previousIds.has(subscriptionId(subscription)),
    );
    this.sendSubscriptionFrame('unsubscribe', removed);
    this.sendSubscriptionFrame('subscribe', added);
  }

  private sendSubscriptionFrame(
    op: 'subscribe' | 'unsubscribe',
    subscriptions: PolyBoltSubscription[],
  ): void {
    if (subscriptions.length === 0) {
      return;
    }

    this.send({
      op,
      rid: this.nextRequestId(op === 'subscribe' ? 's' : 'u'),
      subscriptions: subscriptions.map((subscription) => ({
        channel: subscription.channel,
        filter: toFilter(subscription),
      })),
    });
  }

  private handleMessage(event: WebSocketMessageEvent): void {
    if (
      typeof event.data !== 'string' ||
      event.data === '' ||
      event.data === 'pong'
    ) {
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(event.data);
    } catch (error) {
      DevLogger.log('PolyBoltCryptoFeed: failed to parse message', { error });
      return;
    }

    if (!isRecord(parsed)) {
      return;
    }

    if (typeof parsed.op === 'string') {
      this.handleOp(parsed);
      return;
    }

    this.handleEnvelope(parsed);
  }

  private handleOp(message: Record<string, unknown>): void {
    if (message.op === 'authed') {
      this.authed = true;
      this.listener.onConnectionChange();
      this.sendSubscriptionFrame('subscribe', this.subscriptions);
      return;
    }

    if (message.op !== 'error' || typeof message.code !== 'string') {
      return;
    }

    if (message.code === 'auth_required') {
      this.authed = false;
      this.sendAuth();
      return;
    }

    if (message.code === 'auth_invalid') {
      this.authed = false;
      this.authBlocked = true;
      this.listener.onConnectionChange();
      return;
    }

    if (message.code === 'auth_unavailable') {
      this.scheduleAuthRetry();
    }
  }

  private scheduleAuthRetry(): void {
    if (this.authRetryTimer || this.authBlocked) {
      return;
    }

    this.authRetryTimer = setTimeout(() => {
      this.authRetryTimer = null;
      this.sendAuth();
    }, this.nextBackoffDelay());
  }

  private handleEnvelope(message: Record<string, unknown>): void {
    if (
      (message.channel !== 'price.crypto' &&
        message.channel !== 'price.crypto.twap') ||
      !isRecord(message.payload)
    ) {
      return;
    }

    const channel = message.channel;
    if (message.snapshot === true) {
      const updates = this.parseSnapshot(channel, message.payload);
      if (updates.length > 0) {
        this.listener.onSnapshot(channel, updates);
      }
      return;
    }

    const update = this.parseLivePoint(channel, message.payload);
    if (update) {
      this.listener.onLive(channel, update);
    }
  }

  private findCallerSymbol(
    channel: PolyBoltChannel,
    wireSymbol: string,
  ): string | undefined {
    return this.subscriptions.find(
      (subscription) =>
        subscription.channel === channel &&
        subscription.wireSymbol === wireSymbol,
    )?.callerSymbol;
  }

  private parseSnapshot(
    channel: PolyBoltChannel,
    payload: Record<string, unknown>,
  ): CryptoPriceUpdate[] {
    if (typeof payload.symbol !== 'string' || !Array.isArray(payload.data)) {
      return [];
    }

    const callerSymbol = this.findCallerSymbol(channel, payload.symbol);
    if (!callerSymbol) {
      return [];
    }

    return payload.data
      .flatMap((point) => {
        if (!isRecord(point) || typeof point.timestamp !== 'number') {
          return [];
        }

        const price = parseDecimalPrice(point.full_accuracy_value);
        if (price === undefined) {
          return [];
        }

        return [this.toUpdate(channel, callerSymbol, price, point.timestamp)];
      })
      .sort((left, right) => left.timestamp - right.timestamp);
  }

  private parseLivePoint(
    channel: PolyBoltChannel,
    payload: Record<string, unknown>,
  ): CryptoPriceUpdate | undefined {
    if (
      typeof payload.symbol !== 'string' ||
      typeof payload.timestamp !== 'number'
    ) {
      return undefined;
    }

    if (channel === 'price.crypto.twap' && payload.window_seconds !== 60) {
      return undefined;
    }

    const callerSymbol = this.findCallerSymbol(channel, payload.symbol);
    const price = parseDecimalPrice(payload.full_accuracy_value);
    if (!callerSymbol || price === undefined) {
      return undefined;
    }

    return this.toUpdate(channel, callerSymbol, price, payload.timestamp);
  }

  private toUpdate(
    channel: PolyBoltChannel,
    callerSymbol: string,
    price: number,
    timestamp: number,
  ): CryptoPriceUpdate {
    return {
      symbol: callerSymbol,
      price,
      timestamp,
      ...(channel === 'price.crypto.twap' && {
        twapWindowSeconds: 60 as const,
      }),
    };
  }
}
