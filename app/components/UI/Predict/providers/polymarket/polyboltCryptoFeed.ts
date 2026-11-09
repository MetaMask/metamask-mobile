import type { CryptoPriceProvider, CryptoPriceUpdate } from '../../types';
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
// What `price.crypto` serves when a filter names no provider.
const DEFAULT_CRYPTO_PROVIDER: CryptoPriceProvider = 'chainlink';

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
  /** Vendor pin on `price.crypto`. Absent follows the server default. */
  provider?: CryptoPriceProvider;
}

/**
 * Receives prices per subscription. `provider` is the pin the subscription
 * asked for, so a pinned and an unpinned subscription to one symbol reach
 * different callers. It is omitted for an unpinned subscription.
 */
export interface PolyBoltFeedListener {
  onSnapshot: (
    channel: PolyBoltChannel,
    updates: CryptoPriceUpdate[],
    provider?: CryptoPriceProvider,
  ) => void;
  onLive: (
    channel: PolyBoltChannel,
    update: CryptoPriceUpdate,
    provider?: CryptoPriceProvider,
  ) => void;
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

// The provider is part of the identity: a 5m (Chainlink) and an hourly
// (Binance) BTC market are open together and must not share a subscription.
const subscriptionId = (subscription: PolyBoltSubscription): string =>
  subscription.provider
    ? `${subscription.channel}|${subscription.wireSymbol}|${subscription.provider}`
    : `${subscription.channel}|${subscription.wireSymbol}`;

/**
 * Builds the `filter` of a subscribe or unsubscribe entry.
 *
 * @param channel - PolyBolt channel.
 * @param wireSymbol - Lowercase PolyBolt symbol.
 * @param provider - Vendor pin. TWAP is Chainlink only, so it is not sent there.
 * @returns The filter object for the wire.
 */
export const toPolyboltFilter = (
  channel: PolyBoltChannel,
  wireSymbol: string,
  provider?: CryptoPriceProvider,
): { symbol: string; window_seconds?: 60; provider?: CryptoPriceProvider } => {
  if (channel === 'price.crypto.twap') {
    return { symbol: wireSymbol, window_seconds: 60 };
  }

  return provider ? { symbol: wireSymbol, provider } : { symbol: wireSymbol };
};

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

  // Subscribe rid of each pinned subscription awaiting its ack, so the ack or
  // a bad_filter can be traced back to the pin. Pins go out one per frame.
  private pendingPins: Map<string, string> = new Map();

  // Pinned subscriptions served by the default provider on this connection:
  // the server rejected the pin, ignored it, or named another vendor.
  private ownerServed: Set<string> = new Set();

  private loggedProviderMismatches: Set<string> = new Set();

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
    this.applySubscriptionChange(previous, next);
    // After the diff, which still needs the fallback state of removed pins.
    this.forgetRemoved(next);
  }

  private applySubscriptionChange(
    previous: PolyBoltSubscription[],
    next: PolyBoltSubscription[],
  ): void {
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

  private forgetRemoved(current: PolyBoltSubscription[]): void {
    const currentIds = new Set(current.map(subscriptionId));
    this.ownerServed.forEach((id) => {
      if (!currentIds.has(id)) {
        this.ownerServed.delete(id);
      }
    });
    this.loggedProviderMismatches.forEach((id) => {
      if (!currentIds.has(id)) {
        this.loggedProviderMismatches.delete(id);
      }
    });
  }

  /**
   * The pin actually on the wire for a subscription. A pin that fell back is
   * treated as unpinned, so it shares the server-side subscription of an
   * unpinned listener on the same symbol instead of unsubscribing it.
   */
  private wireProvider(
    subscription: PolyBoltSubscription,
  ): CryptoPriceProvider | undefined {
    return subscription.provider &&
      subscription.channel === 'price.crypto' &&
      !this.ownerServed.has(subscriptionId(subscription))
      ? subscription.provider
      : undefined;
  }

  private wireKey(subscription: PolyBoltSubscription): string {
    return `${subscription.channel}|${subscription.wireSymbol}|${
      this.wireProvider(subscription) ?? ''
    }`;
  }

  private uniqueByWireKey(
    subscriptions: PolyBoltSubscription[],
  ): PolyBoltSubscription[] {
    const byKey = new Map<string, PolyBoltSubscription>();
    subscriptions.forEach((subscription) => {
      const key = this.wireKey(subscription);
      if (!byKey.has(key)) {
        byKey.set(key, subscription);
      }
    });
    return Array.from(byKey.values());
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
    // A symbol's vendor can change between connections, so try each pin again.
    this.pendingPins.clear();
    this.ownerServed.clear();

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

  /**
   * Diffs by what is on the wire, not by subscription id, so two listeners
   * that share one server-side subscription never unsubscribe each other.
   */
  private sendSubscriptionDiff(
    previous: PolyBoltSubscription[],
    next: PolyBoltSubscription[],
  ): void {
    const previousKeys = new Set(
      previous.map((subscription) => this.wireKey(subscription)),
    );
    const nextKeys = new Set(
      next.map((subscription) => this.wireKey(subscription)),
    );
    const removed = previous.filter(
      (subscription) => !nextKeys.has(this.wireKey(subscription)),
    );
    const added = next.filter(
      (subscription) => !previousKeys.has(this.wireKey(subscription)),
    );
    this.sendSubscriptionFrame('unsubscribe', this.uniqueByWireKey(removed));
    this.sendSubscribe(added);
  }

  private sendSubscribe(subscriptions: PolyBoltSubscription[]): void {
    const unique = this.uniqueByWireKey(subscriptions);
    this.sendSubscriptionFrame(
      'subscribe',
      unique.filter((subscription) => !this.wireProvider(subscription)),
    );
    unique
      .filter((subscription) => this.wireProvider(subscription))
      .forEach((subscription) => {
        const rid = this.sendSubscriptionFrame('subscribe', [subscription]);
        if (rid) {
          this.pendingPins.set(rid, subscriptionId(subscription));
        }
      });
  }

  private sendSubscriptionFrame(
    op: 'subscribe' | 'unsubscribe',
    subscriptions: PolyBoltSubscription[],
  ): string | undefined {
    if (subscriptions.length === 0) {
      return undefined;
    }

    const rid = this.nextRequestId(op === 'subscribe' ? 's' : 'u');
    this.send({
      op,
      rid,
      subscriptions: subscriptions.map((subscription) => ({
        channel: subscription.channel,
        filter: toPolyboltFilter(
          subscription.channel,
          subscription.wireSymbol,
          this.wireProvider(subscription),
        ),
      })),
    });
    return rid;
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
      this.sendSubscribe(this.subscriptions);
      return;
    }

    if (message.op === 'subscribed') {
      this.handleSubscribedAck(message);
      return;
    }

    if (message.op !== 'error' || typeof message.code !== 'string') {
      return;
    }

    if (message.code === 'bad_filter') {
      this.handleBadFilter(message);
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

  private takePendingPin(rid: unknown): PolyBoltSubscription | undefined {
    if (typeof rid !== 'string') {
      return undefined;
    }

    const id = this.pendingPins.get(rid);
    if (!id) {
      return undefined;
    }

    this.pendingPins.delete(rid);
    return this.subscriptions.find(
      (subscription) => subscriptionId(subscription) === id,
    );
  }

  /**
   * The ack names the provider actually served while the server's provider
   * selector is on, and omits it while the selector is off, in which case the
   * pin is ignored and the default vendor is served.
   */
  private handleSubscribedAck(message: Record<string, unknown>): void {
    const subscription = this.takePendingPin(message.rid);
    if (!subscription?.provider) {
      return;
    }

    const served =
      typeof message.provider === 'string' ? message.provider : undefined;
    if (served === subscription.provider) {
      return;
    }

    this.ownerServed.add(subscriptionId(subscription));
    this.logProviderMismatch(subscription, served ?? 'none named in ack');
  }

  /**
   * Polymarket's docs disagree on whether a binance pin is honoured, ignored
   * or rejected. When it is rejected, fall back to the default vendor so the
   * market keeps a live price.
   */
  private handleBadFilter(message: Record<string, unknown>): void {
    const subscription = this.takePendingPin(message.rid);
    DevLogger.log('PolyBoltCryptoFeed: filter rejected', {
      channel: message.channel,
      rid: message.rid,
      symbol: subscription?.wireSymbol,
      provider: subscription?.provider,
    });
    if (!subscription) {
      return;
    }

    const alreadyOnWire = new Set(
      this.subscriptions
        .filter((other) => other !== subscription)
        .map((other) => this.wireKey(other)),
    );
    this.ownerServed.add(subscriptionId(subscription));
    if (!alreadyOnWire.has(this.wireKey(subscription))) {
      this.sendSubscriptionFrame('subscribe', [subscription]);
    }
  }

  private logProviderMismatch(
    subscription: PolyBoltSubscription,
    served: string,
  ): void {
    const id = subscriptionId(subscription);
    if (this.loggedProviderMismatches.has(id)) {
      return;
    }

    this.loggedProviderMismatches.add(id);
    DevLogger.log('PolyBoltCryptoFeed: served provider differs from request', {
      channel: subscription.channel,
      symbol: subscription.wireSymbol,
      requested: subscription.provider ?? DEFAULT_CRYPTO_PROVIDER,
      served,
    });
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
    const payload = message.payload;
    if (typeof payload.symbol !== 'string') {
      return;
    }

    const isSnapshot = message.snapshot === true;
    this.findRecipients(channel, payload.symbol, payload.source).forEach(
      (subscription) => {
        this.checkServedSource(subscription, payload.source);
        const { callerSymbol, provider } = subscription;
        if (isSnapshot) {
          const updates = this.parseSnapshot(channel, callerSymbol, payload);
          if (updates.length === 0) {
            return;
          }
          if (provider) {
            this.listener.onSnapshot(channel, updates, provider);
          } else {
            this.listener.onSnapshot(channel, updates);
          }
          return;
        }

        const update = this.parseLivePoint(channel, callerSymbol, payload);
        if (!update) {
          return;
        }
        if (provider) {
          this.listener.onLive(channel, update, provider);
        } else {
          this.listener.onLive(channel, update);
        }
      },
    );
  }

  /**
   * Frames name only channel, symbol and `source`, so `source` is what tells
   * a pinned stream from the default one when both are open for one symbol.
   * A frame goes to the subscriptions pinned to its source, else to those
   * that asked for that source but fell back, else to the default stream.
   * When nothing matches, every subscription for the symbol gets it so
   * prices keep flowing.
   */
  private findRecipients(
    channel: PolyBoltChannel,
    wireSymbol: string,
    source: unknown,
  ): PolyBoltSubscription[] {
    const candidates = this.subscriptions.filter(
      (subscription) =>
        subscription.channel === channel &&
        subscription.wireSymbol === wireSymbol,
    );
    if (candidates.length <= 1) {
      return candidates;
    }

    if (typeof source === 'string') {
      const pinned = candidates.filter(
        (subscription) => this.wireProvider(subscription) === source,
      );
      if (pinned.length > 0) {
        return pinned;
      }

      const requested = candidates.filter(
        (subscription) => subscription.provider === source,
      );
      if (requested.length > 0) {
        return requested;
      }
    }

    const unpinned = candidates.filter(
      (subscription) => !this.wireProvider(subscription),
    );
    return unpinned.length > 0 ? unpinned : candidates;
  }

  private checkServedSource(
    subscription: PolyBoltSubscription,
    source: unknown,
  ): void {
    if (
      typeof source === 'string' &&
      source !== (subscription.provider ?? DEFAULT_CRYPTO_PROVIDER)
    ) {
      this.logProviderMismatch(subscription, source);
    }
  }

  private parseSnapshot(
    channel: PolyBoltChannel,
    callerSymbol: string,
    payload: Record<string, unknown>,
  ): CryptoPriceUpdate[] {
    if (!Array.isArray(payload.data)) {
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
    callerSymbol: string,
    payload: Record<string, unknown>,
  ): CryptoPriceUpdate | undefined {
    if (typeof payload.timestamp !== 'number') {
      return undefined;
    }

    if (channel === 'price.crypto.twap' && payload.window_seconds !== 60) {
      return undefined;
    }

    const price = parseDecimalPrice(payload.full_accuracy_value);
    if (price === undefined) {
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
