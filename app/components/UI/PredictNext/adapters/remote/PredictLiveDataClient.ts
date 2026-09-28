import { AppState, type AppStateStatus } from 'react-native';
import Logger from '../../../../../util/Logger';
import {
  parsePredictLiveDataServerFrame,
  type PredictGameLive,
  type PredictLiveDataServerFrame,
  type PredictLiveDataTopic,
  type PredictQuote,
} from '../../contracts/v1/liveData';
import type { PredictEntityId, PredictVenueId } from '../../types';

const LIVE_DATA_PATH = 'v1/stream/live-data';
const PROTOCOL_VERSION = 1;

/** Close code the gateway sends when the upgrade token is rejected. */
export const PREDICT_LIVE_DATA_UNAUTHORIZED_CLOSE_CODE = 4401;

export const PREDICT_LIVE_DATA_RECONNECT_BASE_MS = 1000;
export const PREDICT_LIVE_DATA_RECONNECT_MAX_MS = 30_000;
export const PREDICT_LIVE_DATA_DISCONNECT_LINGER_MS = 4000;
export const PREDICT_LIVE_DATA_MAX_RECONNECT_ATTEMPTS = 20;
export const PREDICT_LIVE_DATA_DEFAULT_GAME_MAX_PER_CONNECTION = 50;
export const PREDICT_LIVE_DATA_DEFAULT_GAME_MAX_PER_MESSAGE = 100;
export const PREDICT_LIVE_DATA_DEFAULT_MARKET_MAX_PER_CONNECTION = 250;
export const PREDICT_LIVE_DATA_DEFAULT_MARKET_MAX_PER_MESSAGE = 100;

/**
 * Per-topic wire vocabulary: the key the subscribe frame carries its ids under,
 * and the limits assumed until `welcome` says otherwise.
 */
const TOPICS = {
  game: {
    idsKey: 'events',
    defaultMaxPerConnection: PREDICT_LIVE_DATA_DEFAULT_GAME_MAX_PER_CONNECTION,
    defaultMaxPerMessage: PREDICT_LIVE_DATA_DEFAULT_GAME_MAX_PER_MESSAGE,
  },
  market: {
    idsKey: 'markets',
    defaultMaxPerConnection:
      PREDICT_LIVE_DATA_DEFAULT_MARKET_MAX_PER_CONNECTION,
    defaultMaxPerMessage: PREDICT_LIVE_DATA_DEFAULT_MARKET_MAX_PER_MESSAGE,
  },
} as const satisfies Record<
  PredictLiveDataTopic,
  {
    idsKey: string;
    defaultMaxPerConnection: number;
    defaultMaxPerMessage: number;
  }
>;

const TOPIC_NAMES = Object.keys(TOPICS) as PredictLiveDataTopic[];

type WebSocketConstructor = typeof WebSocket;
type TimerId = ReturnType<typeof setTimeout>;
type AppStateApi = Pick<typeof AppState, 'addEventListener'>;

export interface PredictLiveDataClientOptions {
  baseUrl?: string;
  getBearerToken: () => Promise<string | undefined>;
  WebSocket?: WebSocketConstructor;
  AppState?: AppStateApi;
  onGameUpdate: (game: PredictGameLive) => void;
  onQuoteUpdate: (quote: PredictQuote) => void;
}

const parseStreamUrl = (baseUrl?: string): string | undefined => {
  if (!baseUrl) {
    return undefined;
  }
  try {
    const url = new URL(baseUrl);
    url.pathname = `${url.pathname.replace(/\/$/u, '')}/${LIVE_DATA_PATH}`;
    url.search = '';
    url.hash = '';
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    return url.toString();
  } catch {
    return undefined;
  }
};

const readPositiveInt = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isInteger(value) && value > 0
    ? value
    : undefined;

/** Subscription surface the live-data service depends on. */
export interface PredictLiveDataTransport {
  subscribe(
    topic: PredictLiveDataTopic,
    venueId: PredictVenueId,
    ids: readonly PredictEntityId[],
  ): void;
  /** Returns the ids no watcher holds anymore. */
  unsubscribe(
    topic: PredictLiveDataTopic,
    venueId: PredictVenueId,
    ids: readonly PredictEntityId[],
  ): readonly PredictEntityId[];
  destroy(): void;
}

/**
 * One topic's bookkeeping. Screens watch overlapping ids, so each id is held
 * until its last watcher releases it. `serverIds` are the ids the gateway has
 * accepted on this connection; watchers may hold more than `maxPerConnection`,
 * and the extras wait until a slot frees.
 */
class TopicState {
  readonly topic: PredictLiveDataTopic;
  readonly watchCounts = new Map<PredictEntityId, number>();
  readonly serverIds = new Set<PredictEntityId>();
  maxPerConnection: number;
  maxPerMessage: number;

  constructor(topic: PredictLiveDataTopic) {
    this.topic = topic;
    this.maxPerConnection = TOPICS[topic].defaultMaxPerConnection;
    this.maxPerMessage = TOPICS[topic].defaultMaxPerMessage;
  }

  get idsKey(): string {
    return TOPICS[this.topic].idsKey;
  }

  /** Records watchers; returns the ids nobody held before. */
  watch(ids: readonly PredictEntityId[]): PredictEntityId[] {
    const fresh: PredictEntityId[] = [];
    ids.forEach((id) => {
      const held = this.watchCounts.get(id) ?? 0;
      this.watchCounts.set(id, held + 1);
      if (held === 0) {
        fresh.push(id);
      }
    });
    return fresh;
  }

  /** Releases watchers; returns the ids nobody holds anymore. */
  unwatch(ids: readonly PredictEntityId[]): PredictEntityId[] {
    const released: PredictEntityId[] = [];
    ids.forEach((id) => {
      const held = this.watchCounts.get(id);
      if (held === undefined) {
        return;
      }
      if (held > 1) {
        this.watchCounts.set(id, held - 1);
        return;
      }
      this.watchCounts.delete(id);
      released.push(id);
    });
    return released;
  }

  applyLimits(limits?: { maxPerConnection?: number; maxPerMessage?: number }) {
    this.maxPerConnection =
      readPositiveInt(limits?.maxPerConnection) ??
      TOPICS[this.topic].defaultMaxPerConnection;
    this.maxPerMessage =
      readPositiveInt(limits?.maxPerMessage) ??
      TOPICS[this.topic].defaultMaxPerMessage;
  }
}

export class PredictLiveDataClient implements PredictLiveDataTransport {
  readonly #url?: string;
  readonly #getBearerToken: () => Promise<string | undefined>;
  readonly #WebSocket: WebSocketConstructor;
  readonly #onGameUpdate: (game: PredictGameLive) => void;
  readonly #onQuoteUpdate: (quote: PredictQuote) => void;
  readonly #topics: Record<PredictLiveDataTopic, TopicState> = {
    game: new TopicState('game'),
    market: new TopicState('market'),
  };
  #socket?: WebSocket;
  #venueId?: PredictVenueId;
  #welcomed = false;
  #protocolRejected = false;
  #suspended = false;
  #loggedMissingUrl = false;
  #loggedMissingToken = false;
  #loggedReconnectCap = false;
  // Bumped whenever the current connection intent is abandoned (disconnect,
  // suspend) so an in-flight token fetch cannot resurrect a socket.
  #connectEpoch = 0;
  // True only for the in-flight token fetch of the current epoch.
  #connecting = false;
  #reconnectAttempts = 0;
  #reconnectTimer?: TimerId;
  #lingerTimer?: TimerId;
  #appStateSubscription?: { remove: () => void };

  constructor({
    baseUrl,
    getBearerToken,
    WebSocket: WebSocketImpl = global.WebSocket,
    AppState: AppStateImpl = AppState,
    onGameUpdate,
    onQuoteUpdate,
  }: PredictLiveDataClientOptions) {
    this.#url = parseStreamUrl(baseUrl);
    this.#getBearerToken = getBearerToken;
    this.#WebSocket = WebSocketImpl;
    this.#onGameUpdate = onGameUpdate;
    this.#onQuoteUpdate = onQuoteUpdate;
    this.#appStateSubscription = AppStateImpl.addEventListener(
      'change',
      this.#onAppStateChange,
    );
  }

  subscribe(
    topic: PredictLiveDataTopic,
    venueId: PredictVenueId,
    ids: readonly PredictEntityId[],
  ): void {
    this.#cancelLinger();
    this.#venueId = venueId;
    const fresh = this.#topics[topic].watch(ids);

    if (this.#suspended) {
      return;
    }

    if (!this.#isSocketLive()) {
      this.#socket = undefined;
      this.#welcomed = false;
      this.#cancelReconnect();
      this.#reconnectAttempts = 0;
      this.#loggedReconnectCap = false;
      this.#connect();
      return;
    }

    if (fresh.length === 0) {
      return;
    }

    if (this.#welcomed) {
      this.#sendSubscription('subscribe', topic, venueId, fresh);
    }
  }

  unsubscribe(
    topic: PredictLiveDataTopic,
    venueId: PredictVenueId,
    ids: readonly PredictEntityId[],
  ): readonly PredictEntityId[] {
    const released = this.#topics[topic].unwatch(ids);

    if (released.length > 0 && this.#welcomed) {
      this.#sendSubscription('unsubscribe', topic, venueId, released);
      this.#flushUnsentWatches(topic, venueId);
    }
    if (this.#watchedCount() === 0) {
      this.#scheduleLinger();
    }

    return released;
  }

  disconnect(): void {
    this.#abandonConnect();
    this.#cancelReconnect();
    this.#cancelLinger();
    this.#forEachTopic((state) => {
      state.watchCounts.clear();
      state.serverIds.clear();
    });
    this.#welcomed = false;
    this.#venueId = undefined;
    this.#reconnectAttempts = 0;
    this.#loggedReconnectCap = false;
    const socket = this.#socket;
    this.#socket = undefined;
    socket?.close();
  }

  destroy(): void {
    this.#appStateSubscription?.remove();
    this.#appStateSubscription = undefined;
    this.disconnect();
  }

  #forEachTopic(visit: (state: TopicState) => void): void {
    TOPIC_NAMES.forEach((topic) => visit(this.#topics[topic]));
  }

  #watchedCount(): number {
    return TOPIC_NAMES.reduce(
      (total, topic) => total + this.#topics[topic].watchCounts.size,
      0,
    );
  }

  #isSocketLive(): boolean {
    const readyState = this.#socket?.readyState;
    return readyState === 0 || readyState === 1;
  }

  #onAppStateChange = (nextAppState: AppStateStatus): void => {
    if (nextAppState === 'background') {
      this.#suspend();
      return;
    }
    if (nextAppState === 'active') {
      this.#resume();
    }
  };

  #abandonConnect(): void {
    this.#connectEpoch += 1;
    this.#connecting = false;
  }

  #suspend(): void {
    this.#suspended = true;
    this.#abandonConnect();
    this.#cancelReconnect();
    this.#cancelLinger();
    this.#welcomed = false;
    this.#forEachTopic((state) => state.serverIds.clear());
    const socket = this.#socket;
    this.#socket = undefined;
    socket?.close();
  }

  #resume(): void {
    if (!this.#suspended) {
      return;
    }
    this.#suspended = false;
    if (this.#watchedCount() === 0 || this.#protocolRejected) {
      return;
    }
    this.#reconnectAttempts = 0;
    this.#loggedReconnectCap = false;
    this.#connect();
  }

  #connect(): void {
    if (this.#protocolRejected || this.#suspended || this.#connecting) {
      return;
    }
    if (!this.#venueId || this.#isSocketLive()) {
      return;
    }
    if (!this.#url) {
      this.#logMissingUrlOnce();
      return;
    }

    // The gateway authenticates the upgrade request, so a fresh token is
    // resolved for every connection attempt. A provider failure is treated as
    // a missing token, never surfaced.
    const epoch = this.#connectEpoch;
    this.#connecting = true;
    this.#getBearerToken()
      .catch(() => undefined)
      .then((token) => {
        // A later disconnect/suspend already owns connecting. Clearing it
        // here would let a stale fetch unblock a duplicate connect.
        if (epoch !== this.#connectEpoch) {
          return;
        }
        this.#connecting = false;
        // The connection intent may have been abandoned or satisfied while
        // the token was being resolved.
        if (
          this.#protocolRejected ||
          this.#suspended ||
          this.#isSocketLive() ||
          this.#watchedCount() === 0
        ) {
          return;
        }
        if (!token?.trim()) {
          // Retry with backoff: a token can appear later (e.g. once the
          // wallet is unlocked or the session is refreshed).
          this.#logMissingTokenOnce();
          this.#scheduleReconnect();
          return;
        }
        this.#openSocket(token);
      });
  }

  #openSocket(token: string): void {
    const venueId = this.#venueId;
    if (!venueId || !this.#url) {
      return;
    }

    // The token travels as a `token` query parameter — the same contract as
    // MetaMask's BackendWebSocketService. Headers are not portable here: the
    // built-in React Native WebSocket and the Nitro adapter that replaces
    // global.WebSocket take different constructor option shapes.
    const url = new URL(this.#url);
    url.searchParams.set('token', token);

    const socket = new this.#WebSocket(url.toString());
    this.#socket = socket;

    socket.onerror = () => undefined;
    socket.onmessage = ({ data }) => {
      if (typeof data !== 'string') {
        return;
      }

      let decoded: unknown;
      try {
        decoded = JSON.parse(data);
      } catch {
        return;
      }

      const frame = parsePredictLiveDataServerFrame(decoded);
      if (frame) {
        this.#onFrame(frame, venueId);
      }
    };
    socket.onclose = (event?: { code?: number }) => {
      if (this.#socket !== socket) {
        return;
      }

      if (event?.code === PREDICT_LIVE_DATA_UNAUTHORIZED_CLOSE_CODE) {
        Logger.log(
          'PredictLiveDataClient: connection closed as unauthorized; a fresh token is fetched on reconnect',
        );
      }

      this.#socket = undefined;
      this.#welcomed = false;
      if (this.#watchedCount() > 0 && !this.#suspended) {
        this.#scheduleReconnect();
      }
    };
  }

  #onFrame(frame: PredictLiveDataServerFrame, venueId: PredictVenueId): void {
    if (frame.type === 'welcome') {
      if (frame.protocol !== PROTOCOL_VERSION) {
        this.#protocolRejected = true;
        Logger.log(
          'PredictLiveDataClient: unsupported live-data protocol',
          frame.protocol,
        );
        this.disconnect();
        return;
      }
      this.#welcomed = true;
      this.#reconnectAttempts = 0;
      this.#loggedReconnectCap = false;
      this.#forEachTopic((state) => {
        state.applyLimits(frame.limits?.[state.topic]);
        state.serverIds.clear();
        this.#sendSubscription('subscribe', state.topic, venueId, [
          ...state.watchCounts.keys(),
        ]);
      });
      return;
    }

    if (frame.type === 'error') {
      Logger.log(
        'PredictLiveDataClient: server error',
        frame.code,
        frame.message,
      );
      return;
    }

    if (frame.type === 'game' || frame.type === 'game_snapshot') {
      if (this.#topics.game.watchCounts.has(frame.game.eventId)) {
        this.#onGameUpdate(frame.game);
      }
      return;
    }

    if (frame.type === 'quote' || frame.type === 'quote_snapshot') {
      if (this.#topics.market.watchCounts.has(frame.quote.marketId)) {
        this.#onQuoteUpdate(frame.quote);
      }
    }
  }

  #sendSubscription(
    type: 'subscribe' | 'unsubscribe',
    topic: PredictLiveDataTopic,
    venueId: PredictVenueId,
    requested: readonly PredictEntityId[],
  ): void {
    if (
      !this.#socket ||
      this.#socket.readyState !== 1 ||
      requested.length === 0
    ) {
      return;
    }

    const state = this.#topics[topic];
    let ids = [...requested];
    if (type === 'subscribe') {
      ids = ids.filter((id) => !state.serverIds.has(id));
      const remaining = state.maxPerConnection - state.serverIds.size;
      if (remaining <= 0) {
        Logger.log(
          `PredictLiveDataClient: ${topic} subscription limit reached`,
          ids.length,
          state.maxPerConnection,
        );
        return;
      }
      if (ids.length > remaining) {
        Logger.log(
          `PredictLiveDataClient: truncating ${topic} subscribe to connection limit`,
          ids.length,
          remaining,
          state.maxPerConnection,
        );
        ids = ids.slice(0, remaining);
      }
      ids.forEach((id) => state.serverIds.add(id));
    } else {
      ids = ids.filter((id) => state.serverIds.has(id));
      ids.forEach((id) => state.serverIds.delete(id));
    }

    if (ids.length === 0) {
      return;
    }

    for (let index = 0; index < ids.length; index += state.maxPerMessage) {
      this.#socket.send(
        JSON.stringify({
          type,
          topic,
          venueId,
          [state.idsKey]: ids.slice(index, index + state.maxPerMessage),
        }),
      );
    }
  }

  #flushUnsentWatches(
    topic: PredictLiveDataTopic,
    venueId: PredictVenueId,
  ): void {
    const state = this.#topics[topic];
    const pending: PredictEntityId[] = [];
    state.watchCounts.forEach((_held, id) => {
      if (!state.serverIds.has(id)) {
        pending.push(id);
      }
    });
    this.#sendSubscription('subscribe', topic, venueId, pending);
  }

  #scheduleReconnect(): void {
    this.#cancelReconnect();
    if (this.#suspended || this.#watchedCount() === 0) {
      return;
    }

    this.#reconnectAttempts += 1;
    if (this.#reconnectAttempts > PREDICT_LIVE_DATA_MAX_RECONNECT_ATTEMPTS) {
      // Keep retrying at the max delay while anyone is still watching.
      // Giving up here froze live scores on mounted screens: the hook only
      // calls subscribe() for newly added ids, so Home/Feed/Event never
      // reset this counter after a background socket drop.
      this.#reconnectAttempts = PREDICT_LIVE_DATA_MAX_RECONNECT_ATTEMPTS;
      this.#logReconnectCapOnce();
    }

    this.#reconnectTimer = setTimeout(() => {
      this.#reconnectTimer = undefined;
      this.#connect();
    }, this.#reconnectDelayMs());
  }

  #reconnectDelayMs(): number {
    return Math.min(
      PREDICT_LIVE_DATA_RECONNECT_MAX_MS,
      PREDICT_LIVE_DATA_RECONNECT_BASE_MS * 2 ** (this.#reconnectAttempts - 1),
    );
  }

  #scheduleLinger(): void {
    this.#cancelLinger();
    this.#lingerTimer = setTimeout(() => {
      this.#lingerTimer = undefined;
      if (this.#watchedCount() === 0) {
        this.disconnect();
      }
    }, PREDICT_LIVE_DATA_DISCONNECT_LINGER_MS);
  }

  #cancelReconnect(): void {
    if (this.#reconnectTimer !== undefined) {
      clearTimeout(this.#reconnectTimer);
      this.#reconnectTimer = undefined;
    }
  }

  #cancelLinger(): void {
    if (this.#lingerTimer !== undefined) {
      clearTimeout(this.#lingerTimer);
      this.#lingerTimer = undefined;
    }
  }

  #logMissingUrlOnce(): void {
    if (this.#loggedMissingUrl) {
      return;
    }
    this.#loggedMissingUrl = true;
    Logger.log('PredictLiveDataClient: stream URL is missing or invalid');
  }

  #logMissingTokenOnce(): void {
    if (this.#loggedMissingToken) {
      return;
    }
    this.#loggedMissingToken = true;
    Logger.log('PredictLiveDataClient: no bearer token available for stream');
  }

  #logReconnectCapOnce(): void {
    if (this.#loggedReconnectCap) {
      return;
    }
    this.#loggedReconnectCap = true;
    Logger.log(
      'PredictLiveDataClient: capping reconnect delay after max attempts',
    );
  }
}
