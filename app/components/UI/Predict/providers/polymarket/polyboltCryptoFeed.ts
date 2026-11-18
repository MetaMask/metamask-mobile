import { captureMessage } from '@sentry/react-native';
import type { CryptoPriceProvider, CryptoPriceUpdate } from '../../types';
import DevLogger from '../../../../../core/SDKConnect/utils/DevLogger';
import Logger from '../../../../../util/Logger';
import { PREDICT_CONSTANTS } from '../../constants/errors';
import { POLYMARKET_PROVIDER_ID } from './constants';

export const POLYBOLT_WS_URL = 'wss://ws-live-v2.polymarket.com/ws';

const AUTH_CLOSE_CODE = 4001;
const DRAINING_CLOSE_CODE = 4003;
const POLICY_CLOSE_CODE = 4008;
const ABNORMAL_CLOSE_CODE = 1006;
const MAX_AUTH_FRAMES = 8;
const MAX_SUBSCRIPTIONS = 64;
const MAX_PENDING_FRAMES = 256;
const MAX_BACKOFF_MS = 30_000;
const BASE_BACKOFF_MS = 1_000;
// The provider named for a subscription without a pin. PolyBolt requires a
// provider on every filter, and TWAP is served by Chainlink only.
const DEFAULT_CRYPTO_PROVIDER: CryptoPriceProvider = 'chainlink';

export interface PolyBoltCredentials {
  apiKey: string;
  secret: string;
  passphrase: string;
  /**
   * Chainlink API key for Chainlink-served streams, TWAP included. PolyBolt
   * reads it only from a connection's first auth frame, so a new key needs a
   * new connection. Never log it.
   */
  chainlinkApiKey?: string;
}

export type PolyBoltChannel = 'price.crypto' | 'price.crypto.twap';

export interface PolyBoltSubscription {
  channel: PolyBoltChannel;
  callerSymbol: string;
  wireSymbol: string;
  /** Vendor pin on `price.crypto`. Absent means Chainlink. */
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

interface PendingFrame {
  op: 'subscribe' | 'unsubscribe';
  subscriptions: PolyBoltSubscription[];
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
 * Builds the `filter` of a subscribe or unsubscribe entry. PolyBolt rejects a
 * filter without a provider, so every filter names one unless the pre-enforcement
 * TWAP fallback explicitly omits it.
 *
 * @param channel - PolyBolt channel.
 * @param wireSymbol - Lowercase PolyBolt symbol.
 * @param provider - Vendor pin. Absent, or on TWAP, the filter names Chainlink.
 * @param includeTwapProvider - Whether to include `provider` on TWAP filters.
 * @returns The filter object for the wire.
 */
export const toPolyboltFilter = (
  channel: PolyBoltChannel,
  wireSymbol: string,
  provider?: CryptoPriceProvider,
  includeTwapProvider = true,
): { symbol: string; window_seconds?: 60; provider?: CryptoPriceProvider } => {
  if (channel === 'price.crypto.twap') {
    return {
      symbol: wireSymbol,
      window_seconds: 60,
      ...(includeTwapProvider && { provider: DEFAULT_CRYPTO_PROVIDER }),
    };
  }

  return { symbol: wireSymbol, provider: provider ?? DEFAULT_CRYPTO_PROVIDER };
};

// Searchable in Sentry with the other Predict errors. Callers pass only
// subscription details, never credentials.
const reportToSentry = (
  message: string,
  data: Record<string, unknown>,
): void => {
  Logger.error(new Error(message), {
    tags: {
      feature: PREDICT_CONSTANTS.FEATURE_NAME,
      provider: POLYMARKET_PROVIDER_ID,
    },
    context: { name: 'PolyBoltCryptoFeed', data },
  });
};

const warnToSentry = (message: string, data: Record<string, unknown>): void => {
  captureMessage(message, {
    level: 'warning',
    tags: {
      feature: PREDICT_CONSTANTS.FEATURE_NAME,
      provider: POLYMARKET_PROVIDER_ID,
    },
    contexts: { PolyBoltCryptoFeed: data },
  });
};

const compareIds = (left: string, right: string): number =>
  left.localeCompare(right);

// Uniform integer in [0, maxExclusive) for reconnect jitter.
const randomInt = (maxExclusive: number): number => {
  const value = new Uint32Array(1);
  global.crypto.getRandomValues(value);
  return Math.floor((value[0] / 0x1_0000_0000) * maxExclusive);
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
  private readonly pendingPins: Map<string, string> = new Map();

  // Subscriptions sent in each subscribe/unsubscribe frame awaiting ack or error,
  // keyed by rid so unpinned rejections (such as TWAP) still resolve symbols.
  private readonly pendingFrames: Map<string, PendingFrame> = new Map();

  // TWAP subscriptions retried without `provider` on this connection during the
  // pre-enforcement window.
  private readonly retriedTwapWithoutProvider: Set<string> = new Set();

  // Latest subscribe rid sent per wireKey on this connection, so a rejected
  // unpinned frame does not resend an entry another frame already put on the wire.
  private readonly latestSubscribeRid: Map<string, string> = new Map();

  // Unpinned bad_filter warnings already sent (keyed without rid), so a
  // reconnect loop cannot spam Sentry.
  private readonly warnedBadFilters: Set<string> = new Set();

  // rids already handled by handleBadFilter on this connection.
  private readonly handledBadFilterRids: Set<string> = new Set();

  // Pinned subscriptions served by the default provider on this connection:
  // the server rejected the pin, ignored it, or named another vendor.
  private readonly ownerServed: Set<string> = new Set();

  private readonly loggedProviderMismatches: Set<string> = new Set();

  // Set by `chainlink_key_required`: this connection has no usable Chainlink
  // key, so Chainlink subscriptions are not sent again until a new connection.
  private chainlinkUnavailable = false;

  // Error codes already reported on this connection, so each logs once.
  private readonly reportedErrorCodes: Set<string> = new Set();

  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  private authRetryTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly listener: PolyBoltFeedListener;

  constructor(listener: PolyBoltFeedListener) {
    this.listener = listener;
  }

  isConnected(): boolean {
    return this.authed && this.socket?.readyState === WebSocket.OPEN;
  }

  /**
   * Sets the credentials for the next connection. A change, including a
   * Chainlink key that arrives or rotates, opens a new connection, because
   * PolyBolt reads the key only from a connection's first auth frame. After
   * `disconnect`, for example in the background, the change waits for
   * `reconnect` or the next subscription.
   */
  setCredentials(credentials: PolyBoltCredentials): void {
    if (this.sameCredentials(credentials)) {
      return;
    }

    this.credentials = credentials;
    this.authBlocked = false;
    this.authFramesSent = 0;
    if (this.subscriptions.length > 0 && !this.closedByClient) {
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
    this.pendingPins.clear();
    this.pendingFrames.clear();
    this.handledBadFilterRids.clear();
    this.retriedTwapWithoutProvider.clear();
    this.latestSubscribeRid.clear();
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
    const currentChannelSymbols = new Set(
      current.map(
        (subscription) => `${subscription.channel}|${subscription.wireSymbol}`,
      ),
    );
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
    this.retriedTwapWithoutProvider.forEach((id) => {
      if (!currentIds.has(id)) {
        this.retriedTwapWithoutProvider.delete(id);
      }
    });
    this.warnedBadFilters.forEach((key) => {
      if (!key.startsWith('untracked|') && !currentChannelSymbols.has(key)) {
        this.warnedBadFilters.delete(key);
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
      subscription.provider !== DEFAULT_CRYPTO_PROVIDER &&
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
      this.credentials.passphrase === credentials.passphrase &&
      (this.credentials.chainlinkApiKey ?? '') ===
        (credentials.chainlinkApiKey ?? '')
    );
  }

  private sameSubscriptionSet(
    left: PolyBoltSubscription[],
    right: PolyBoltSubscription[],
  ): boolean {
    const leftIds = left.map(subscriptionId).sort(compareIds);
    const rightIds = right.map(subscriptionId).sort(compareIds);
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
    this.pendingFrames.clear();
    this.handledBadFilterRids.clear();
    this.retriedTwapWithoutProvider.clear();
    this.latestSubscribeRid.clear();
    this.ownerServed.clear();
    this.chainlinkUnavailable = false;
    this.reportedErrorCodes.clear();

    try {
      this.socket = new WebSocket(POLYBOLT_WS_URL);
    } catch (error) {
      DevLogger.log('PolyBoltCryptoFeed: failed to open socket', { error });
      this.scheduleReconnect(this.nextBackoffDelay());
      return;
    }

    // The backoff resets on `authed`, not here: with a Chainlink key each
    // failed auth opens a new socket, so a reset on open would retry at the
    // first step forever while the server refuses auth.
    this.socket.onopen = () => {
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
      this.scheduleReconnect(randomInt(10_001));
      return;
    }

    this.scheduleReconnect(this.nextBackoffDelay());
  }

  private nextBackoffDelay(): number {
    this.reconnectAttempts += 1;
    const exponent = Math.min(this.reconnectAttempts - 1, 5);
    const base = Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * 2 ** exponent);
    const jitter = randomInt(1_000);
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

    const { chainlinkApiKey } = this.credentials;
    // PolyBolt reads the Chainlink key only from a connection's first auth
    // frame. Another auth frame here would leave Chainlink streams without
    // it, so authenticate again on a new connection.
    if (chainlinkApiKey && this.authFramesSent > 0) {
      if (!this.reconnectTimer && !this.policyBlocked) {
        this.scheduleReconnect(this.nextBackoffDelay());
      }
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
      // Top level, next to `auth`, never inside it.
      ...(chainlinkApiKey && { chainlink_api_key: chainlinkApiKey }),
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
    const uniqueRemoved = this.uniqueByWireKey(removed);
    const isTwapWithoutProvider = (
      subscription: PolyBoltSubscription,
    ): boolean =>
      subscription.channel === 'price.crypto.twap' &&
      this.retriedTwapWithoutProvider.has(subscriptionId(subscription));
    this.sendSubscriptionFrame(
      'unsubscribe',
      uniqueRemoved.filter(
        (subscription) => !isTwapWithoutProvider(subscription),
      ),
    );
    this.sendSubscriptionFrame(
      'unsubscribe',
      uniqueRemoved.filter(isTwapWithoutProvider),
      false,
    );
    this.sendSubscribe(added);
  }

  /**
   * Sends every Chainlink subscription, spot and TWAP, in one frame, and each
   * other vendor's pin in a frame of its own so its ack can be matched to it.
   * After `chainlink_key_required`, Chainlink subscriptions are not sent again
   * on this connection.
   */
  private sendSubscribe(subscriptions: PolyBoltSubscription[]): void {
    const unique = this.uniqueByWireKey(subscriptions);
    if (!this.chainlinkUnavailable) {
      this.sendSubscriptionFrame(
        'subscribe',
        unique.filter((subscription) => !this.wireProvider(subscription)),
      );
    }
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
    includeTwapProvider = true,
  ): string | undefined {
    if (
      subscriptions.length === 0 ||
      this.socket?.readyState !== WebSocket.OPEN
    ) {
      return undefined;
    }

    const rid = this.nextRequestId(op === 'subscribe' ? 's' : 'u');
    if (this.pendingFrames.size >= MAX_PENDING_FRAMES) {
      const oldestRid = this.pendingFrames.keys().next().value;
      if (oldestRid !== undefined) {
        this.pendingFrames.delete(oldestRid);
      }
    }
    this.pendingFrames.set(rid, { op, subscriptions: [...subscriptions] });
    subscriptions.forEach((subscription) => {
      const key = this.wireKey(subscription);
      if (op === 'subscribe') {
        this.latestSubscribeRid.set(key, rid);
      } else {
        this.latestSubscribeRid.delete(key);
      }
    });
    this.send({
      op,
      rid,
      subscriptions: subscriptions.map((subscription) => ({
        channel: subscription.channel,
        filter: toPolyboltFilter(
          subscription.channel,
          subscription.wireSymbol,
          this.wireProvider(subscription),
          includeTwapProvider,
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
      this.reconnectAttempts = 0;
      this.listener.onConnectionChange();
      this.sendSubscribe(this.subscriptions);
      return;
    }

    if (message.op === 'subscribed') {
      this.handleSubscribedAck(message);
      return;
    }

    if (message.op === 'unsubscribed') {
      this.takePendingFrame(message.rid);
      return;
    }

    if (message.op !== 'error' || typeof message.code !== 'string') {
      return;
    }

    if (message.code === 'bad_filter') {
      this.handleBadFilter(message);
      return;
    }

    if (message.code === 'chainlink_key_required') {
      this.handleChainlinkKeyRequired(message);
      return;
    }

    if (message.code === 'provider_required') {
      // Every filter names a provider, so this is a client bug. Resending the
      // same frame would fail the same way.
      this.takePendingPin(message.rid);
      this.takePendingFrame(message.rid);
      this.reportErrorOnce(message);
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
      return;
    }

    this.takePendingFrame(message.rid);
  }

  private takePendingFrame(rid: unknown): PendingFrame | undefined {
    if (typeof rid !== 'string') {
      return undefined;
    }

    const frame = this.pendingFrames.get(rid);
    if (!frame) {
      return undefined;
    }

    this.pendingFrames.delete(rid);
    return frame;
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
    this.takePendingFrame(message.rid);
    if (!subscription?.provider) {
      return;
    }

    const served =
      typeof message.provider === 'string' ? message.provider : undefined;
    if (served === subscription.provider) {
      return;
    }

    this.ownerServed.add(subscriptionId(subscription));
    if (typeof message.rid === 'string') {
      this.latestSubscribeRid.set(this.wireKey(subscription), message.rid);
    }
    this.logProviderMismatch(subscription, served ?? 'none named in ack');
  }

  /**
   * Polymarket's docs disagree on whether a binance pin is honoured, ignored
   * or rejected. When it is rejected, fall back to Chainlink so the market
   * keeps a live price. For unpinned rejections (such as TWAP), warn Sentry
   * once, retry TWAP subscriptions once without `provider`, and resend active
   * non-TWAP entries from a rejected shared frame with their provider.
   */
  private handleBadFilter(message: Record<string, unknown>): void {
    const subscription = this.takePendingPin(message.rid);
    const frame = this.takePendingFrame(message.rid);
    if (subscription) {
      if (typeof message.rid === 'string') {
        this.handledBadFilterRids.add(message.rid);
      }
      DevLogger.log('PolyBoltCryptoFeed: filter rejected', {
        channel: message.channel,
        rid: message.rid,
        symbol: subscription.wireSymbol,
        provider: subscription.provider,
      });
      const alreadyOnWire = new Set(
        this.subscriptions
          .filter((other) => other !== subscription)
          .map((other) => this.wireKey(other)),
      );
      this.ownerServed.add(subscriptionId(subscription));
      this.logProviderMismatch(subscription, 'none, filter rejected');
      if (
        !this.chainlinkUnavailable &&
        !alreadyOnWire.has(this.wireKey(subscription))
      ) {
        this.sendSubscriptionFrame('subscribe', [subscription]);
      }
      return;
    }

    const resolvedSubscriptions = frame
      ? this.resolveRejectedSubscriptions(frame.subscriptions, message.channel)
      : [];
    const symbol = this.formatRejectedSymbols(resolvedSubscriptions);
    const channel =
      typeof message.channel === 'string'
        ? message.channel
        : this.formatRejectedChannels(resolvedSubscriptions);
    DevLogger.log('PolyBoltCryptoFeed: filter rejected', {
      channel,
      rid: message.rid,
      symbol,
      provider: undefined,
    });
    this.warnBadFilterOnce(message, channel, symbol, resolvedSubscriptions);

    if (frame?.op === 'subscribe' && !this.chainlinkUnavailable) {
      this.resendRejectedUnpinnedFrame(frame.subscriptions, message.rid);
    }
  }

  private resolveRejectedSubscriptions(
    subscriptions: PolyBoltSubscription[],
    channel: unknown,
  ): PolyBoltSubscription[] {
    if (typeof channel === 'string') {
      const matching = subscriptions.filter(
        (subscription) => subscription.channel === channel,
      );
      if (matching.length > 0) {
        return matching;
      }
    }
    return subscriptions;
  }

  private formatRejectedSymbols(
    subscriptions: PolyBoltSubscription[],
  ): string | undefined {
    const symbols = Array.from(
      new Set(subscriptions.map((subscription) => subscription.wireSymbol)),
    );
    return symbols.length > 0 ? symbols.join(',') : undefined;
  }

  private formatRejectedChannels(
    subscriptions: PolyBoltSubscription[],
  ): string | undefined {
    const channels = Array.from(
      new Set(subscriptions.map((subscription) => subscription.channel)),
    );
    return channels.length > 0 ? channels.join(',') : undefined;
  }

  private warnBadFilterOnce(
    message: Record<string, unknown>,
    channel: string | undefined,
    symbol: string | undefined,
    resolvedSubscriptions: PolyBoltSubscription[],
  ): void {
    const rid = typeof message.rid === 'string' ? message.rid : undefined;
    if (rid !== undefined && this.handledBadFilterRids.has(rid)) {
      return;
    }
    if (rid !== undefined) {
      this.handledBadFilterRids.add(rid);
    }

    const dedupKeys =
      resolvedSubscriptions.length > 0
        ? resolvedSubscriptions.map(
            (subscription) =>
              `${subscription.channel}|${subscription.wireSymbol}`,
          )
        : [`untracked|${channel ?? ''}`];
    if (dedupKeys.every((key) => this.warnedBadFilters.has(key))) {
      return;
    }
    dedupKeys.forEach((key) => {
      this.warnedBadFilters.add(key);
    });

    warnToSentry('PolyBoltCryptoFeed: filter rejected', {
      code: message.code,
      message: message.message,
      channel,
      rid: message.rid,
      ...(symbol !== undefined && { symbol }),
    });
  }

  private resendRejectedUnpinnedFrame(
    subscriptions: PolyBoltSubscription[],
    rejectedRid: unknown,
  ): void {
    const rid = typeof rejectedRid === 'string' ? rejectedRid : undefined;
    const activeIds = new Set(this.subscriptions.map(subscriptionId));
    const activeWireKeys = new Set(
      this.subscriptions.map((subscription) => this.wireKey(subscription)),
    );
    const hasTwap = subscriptions.some(
      (subscription) => subscription.channel === 'price.crypto.twap',
    );
    const isAlreadyOnWire = (subscription: PolyBoltSubscription): boolean => {
      const latestRid = this.latestSubscribeRid.get(this.wireKey(subscription));
      return latestRid !== undefined && latestRid !== rid;
    };

    const nonTwapRetries = hasTwap
      ? subscriptions.filter(
          (subscription) =>
            subscription.channel !== 'price.crypto.twap' &&
            activeWireKeys.has(this.wireKey(subscription)) &&
            !isAlreadyOnWire(subscription),
        )
      : [];
    const twapRetries = subscriptions.filter((subscription) => {
      if (subscription.channel !== 'price.crypto.twap') {
        return false;
      }
      const id = subscriptionId(subscription);
      return (
        activeIds.has(id) &&
        !this.retriedTwapWithoutProvider.has(id) &&
        !isAlreadyOnWire(subscription)
      );
    });

    if (nonTwapRetries.length > 0) {
      this.sendSubscriptionFrame('subscribe', nonTwapRetries);
    }
    if (twapRetries.length > 0) {
      twapRetries.forEach((subscription) => {
        this.retriedTwapWithoutProvider.add(subscriptionId(subscription));
      });
      // TODO: Remove this pre-2026-11-30 no-provider TWAP retry once PolyBolt
      // enforces `provider_required` (4011) on 2026-11-30; after that date a
      // filter without a provider is refused with 4011, handled elsewhere and
      // reported.
      this.sendSubscriptionFrame('subscribe', twapRetries, false);
    }
  }

  /**
   * The connection was authenticated without a valid Chainlink key, so no
   * Chainlink stream registers on it. The error does not close the socket and
   * Binance pins keep streaming. Sending Chainlink subscriptions again would
   * repeat the error, so they wait for a new connection, such as the one a
   * new key opens.
   */
  private handleChainlinkKeyRequired(message: Record<string, unknown>): void {
    this.takePendingPin(message.rid);
    this.takePendingFrame(message.rid);
    this.chainlinkUnavailable = true;
    this.reportErrorOnce(message, {
      hasChainlinkApiKey: Boolean(this.credentials?.chainlinkApiKey),
    });
  }

  private reportErrorOnce(
    message: Record<string, unknown>,
    extra: Record<string, unknown> = {},
  ): void {
    const code = String(message.code);
    if (this.reportedErrorCodes.has(code)) {
      return;
    }

    this.reportedErrorCodes.add(code);
    const details = {
      code,
      status: message.status,
      channel: message.channel,
      rid: message.rid,
      ...extra,
    };
    DevLogger.log('PolyBoltCryptoFeed: subscription refused', details);
    reportToSentry(`PolyBoltCryptoFeed: ${code}`, details);
  }

  /**
   * Logs once per subscription when a stream comes from another vendor than
   * it asked for, and reports it to Sentry: the market keeps a price, but not
   * from the vendor it settles on. A pin that falls back, because PolyBolt
   * rejected, ignored or overrode it, is an error. A Chainlink request served
   * by another vendor is a warning.
   */
  private logProviderMismatch(
    subscription: PolyBoltSubscription,
    served: string,
  ): void {
    const id = subscriptionId(subscription);
    if (this.loggedProviderMismatches.has(id)) {
      return;
    }

    this.loggedProviderMismatches.add(id);
    const details = {
      channel: subscription.channel,
      symbol: subscription.wireSymbol,
      requested: subscription.provider ?? DEFAULT_CRYPTO_PROVIDER,
      served,
    };
    DevLogger.log(
      'PolyBoltCryptoFeed: served provider differs from request',
      details,
    );
    if (details.requested !== DEFAULT_CRYPTO_PROVIDER) {
      reportToSentry('PolyBoltCryptoFeed: provider pin fell back', details);
    } else {
      warnToSentry(
        'PolyBoltCryptoFeed: Chainlink request served by another vendor',
        details,
      );
    }
  }

  private scheduleAuthRetry(): void {
    if (this.authBlocked) {
      return;
    }

    // With a Chainlink key already sent on this socket, retrying auth requires
    // opening a new connection; schedule the reconnect directly so backoff
    // advances once per retry instead of once here and again inside sendAuth.
    if (this.credentials?.chainlinkApiKey && this.authFramesSent > 0) {
      if (!this.reconnectTimer && !this.policyBlocked) {
        this.scheduleReconnect(this.nextBackoffDelay());
      }
      return;
    }

    if (this.authRetryTimer) {
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

      // A Chainlink request shares the unpinned stream, so Chainlink frames
      // fall through to every subscription on that stream below.
      const requested = candidates.filter(
        (subscription) =>
          source !== DEFAULT_CRYPTO_PROVIDER &&
          subscription.provider === source,
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
