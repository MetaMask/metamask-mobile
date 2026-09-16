import { AppState, type AppStateStatus } from 'react-native';
import Logger from '../../../../../util/Logger';
import {
  parsePredictLiveDataServerFrame,
  type PredictGameLive,
  type PredictLiveDataServerFrame,
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

type WebSocketConstructor = typeof WebSocket;
type TimerId = ReturnType<typeof setTimeout>;
type AppStateApi = Pick<typeof AppState, 'addEventListener'>;

export interface PredictLiveDataClientOptions {
  baseUrl?: string;
  getBearerToken: () => Promise<string | undefined>;
  WebSocket?: WebSocketConstructor;
  AppState?: AppStateApi;
  onGameUpdate: (game: PredictGameLive) => void;
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
    venueId: PredictVenueId,
    eventIds: readonly PredictEntityId[],
  ): void;
  /** Returns the Event ids no watcher holds anymore. */
  unsubscribe(
    venueId: PredictVenueId,
    eventIds: readonly PredictEntityId[],
  ): readonly PredictEntityId[];
  destroy(): void;
}

export class PredictLiveDataClient implements PredictLiveDataTransport {
  readonly #url?: string;
  readonly #getBearerToken: () => Promise<string | undefined>;
  readonly #WebSocket: WebSocketConstructor;
  readonly #onGameUpdate: (game: PredictGameLive) => void;
  // Screens watch overlapping Events, so each id is held until its last
  // watcher releases it.
  readonly #watchCounts = new Map<PredictEntityId, number>();
  // Ids the gateway has accepted on this connection. Watchers may hold more
  // than `maxPerConnection`; extras wait until a slot frees.
  readonly #serverGameIds = new Set<PredictEntityId>();
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
  #gameMaxPerConnection = PREDICT_LIVE_DATA_DEFAULT_GAME_MAX_PER_CONNECTION;
  #gameMaxPerMessage = PREDICT_LIVE_DATA_DEFAULT_GAME_MAX_PER_MESSAGE;

  constructor({
    baseUrl,
    getBearerToken,
    WebSocket: WebSocketImpl = global.WebSocket,
    AppState: AppStateImpl = AppState,
    onGameUpdate,
  }: PredictLiveDataClientOptions) {
    this.#url = parseStreamUrl(baseUrl);
    this.#getBearerToken = getBearerToken;
    this.#WebSocket = WebSocketImpl;
    this.#onGameUpdate = onGameUpdate;
    this.#appStateSubscription = AppStateImpl.addEventListener(
      'change',
      this.#onAppStateChange,
    );
  }

  subscribe(
    venueId: PredictVenueId,
    eventIds: readonly PredictEntityId[],
  ): void {
    this.#cancelLinger();
    this.#venueId = venueId;
    const fresh: PredictEntityId[] = [];
    eventIds.forEach((eventId) => {
      const held = this.#watchCounts.get(eventId) ?? 0;
      this.#watchCounts.set(eventId, held + 1);
      if (held === 0) {
        fresh.push(eventId);
      }
    });

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
      this.#sendSubscription('subscribe', venueId, fresh);
    }
  }

  unsubscribe(
    venueId: PredictVenueId,
    eventIds: readonly PredictEntityId[],
  ): readonly PredictEntityId[] {
    const released: PredictEntityId[] = [];
    eventIds.forEach((eventId) => {
      const held = this.#watchCounts.get(eventId);
      if (held === undefined) {
        return;
      }

      if (held > 1) {
        this.#watchCounts.set(eventId, held - 1);
        return;
      }

      this.#watchCounts.delete(eventId);
      released.push(eventId);
    });

    if (released.length > 0 && this.#welcomed) {
      this.#sendSubscription('unsubscribe', venueId, released);
      this.#flushUnsentWatches(venueId);
    }
    if (this.#watchCounts.size === 0) {
      this.#scheduleLinger();
    }

    return released;
  }

  disconnect(): void {
    this.#abandonConnect();
    this.#cancelReconnect();
    this.#cancelLinger();
    this.#watchCounts.clear();
    this.#serverGameIds.clear();
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
    this.#serverGameIds.clear();
    const socket = this.#socket;
    this.#socket = undefined;
    socket?.close();
  }

  #resume(): void {
    if (!this.#suspended) {
      return;
    }
    this.#suspended = false;
    if (this.#watchCounts.size === 0 || this.#protocolRejected) {
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
          this.#watchCounts.size === 0
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
      if (this.#watchCounts.size > 0 && !this.#suspended) {
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
      this.#applyWelcomeLimits(frame);
      this.#serverGameIds.clear();
      this.#sendSubscription('subscribe', venueId, [
        ...this.#watchCounts.keys(),
      ]);
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
      if (this.#watchCounts.has(frame.game.eventId)) {
        this.#onGameUpdate(frame.game);
      }
    }
  }

  #sendSubscription(
    type: 'subscribe' | 'unsubscribe',
    venueId: PredictVenueId,
    eventIds: readonly PredictEntityId[],
  ): void {
    if (
      !this.#socket ||
      this.#socket.readyState !== 1 ||
      eventIds.length === 0
    ) {
      return;
    }

    let ids = [...eventIds];
    if (type === 'subscribe') {
      ids = ids.filter((eventId) => !this.#serverGameIds.has(eventId));
      const remaining = this.#gameMaxPerConnection - this.#serverGameIds.size;
      if (remaining <= 0) {
        Logger.log(
          'PredictLiveDataClient: game subscription limit reached',
          ids.length,
          this.#gameMaxPerConnection,
        );
        return;
      }
      if (ids.length > remaining) {
        Logger.log(
          'PredictLiveDataClient: truncating game subscribe to connection limit',
          ids.length,
          remaining,
          this.#gameMaxPerConnection,
        );
        ids = ids.slice(0, remaining);
      }
      ids.forEach((eventId) => this.#serverGameIds.add(eventId));
    } else {
      ids = ids.filter((eventId) => this.#serverGameIds.has(eventId));
      ids.forEach((eventId) => this.#serverGameIds.delete(eventId));
    }

    if (ids.length === 0) {
      return;
    }

    for (let index = 0; index < ids.length; index += this.#gameMaxPerMessage) {
      this.#socket.send(
        JSON.stringify({
          type,
          topic: 'game',
          venueId,
          events: ids.slice(index, index + this.#gameMaxPerMessage),
        }),
      );
    }
  }

  #flushUnsentWatches(venueId: PredictVenueId): void {
    const pending: PredictEntityId[] = [];
    this.#watchCounts.forEach((_held, eventId) => {
      if (!this.#serverGameIds.has(eventId)) {
        pending.push(eventId);
      }
    });
    this.#sendSubscription('subscribe', venueId, pending);
  }

  #applyWelcomeLimits(
    frame: Extract<PredictLiveDataServerFrame, { type: 'welcome' }>,
  ): void {
    const gameLimits = frame.limits?.game;
    const maxPerConnection = readPositiveInt(gameLimits?.maxPerConnection);
    const maxPerMessage = readPositiveInt(gameLimits?.maxPerMessage);
    this.#gameMaxPerConnection =
      maxPerConnection ?? PREDICT_LIVE_DATA_DEFAULT_GAME_MAX_PER_CONNECTION;
    this.#gameMaxPerMessage =
      maxPerMessage ?? PREDICT_LIVE_DATA_DEFAULT_GAME_MAX_PER_MESSAGE;
  }

  #scheduleReconnect(): void {
    this.#cancelReconnect();
    if (this.#suspended || this.#watchCounts.size === 0) {
      return;
    }

    this.#reconnectAttempts += 1;
    if (this.#reconnectAttempts > PREDICT_LIVE_DATA_MAX_RECONNECT_ATTEMPTS) {
      // Keep retrying at the max delay while anyone is still watching.
      // Giving up here froze live scores on mounted screens: the hook only
      // calls subscribe() for newly added Event ids, so Home/Feed/Event
      // never reset this counter after a background socket drop.
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
      if (this.#watchCounts.size === 0) {
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
