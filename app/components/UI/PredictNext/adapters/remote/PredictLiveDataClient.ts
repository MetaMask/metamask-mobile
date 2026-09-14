import Logger from '../../../../../util/Logger';
import {
  parsePredictLiveDataServerFrame,
  type PredictGameLive,
  type PredictLiveDataServerFrame,
} from '../../contracts/v1/liveData';
import type { PredictEntityId, PredictVenueId } from '../../types';

const LIVE_DATA_PATH = 'v1/stream/live-data';
const PROTOCOL_VERSION = 1;

export const PREDICT_LIVE_DATA_RECONNECT_BASE_MS = 1000;
export const PREDICT_LIVE_DATA_RECONNECT_MAX_MS = 30_000;
export const PREDICT_LIVE_DATA_DISCONNECT_LINGER_MS = 4000;
export const PREDICT_LIVE_DATA_MAX_RECONNECT_ATTEMPTS = 20;

type WebSocketConstructor = typeof WebSocket;
type TimerId = ReturnType<typeof setTimeout>;

export interface PredictLiveDataClientOptions {
  baseUrl?: string;
  WebSocket?: WebSocketConstructor;
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
  readonly #WebSocket: WebSocketConstructor;
  readonly #onGameUpdate: (game: PredictGameLive) => void;
  // Screens watch overlapping Events, so each id is held until its last
  // watcher releases it.
  readonly #watchCounts = new Map<PredictEntityId, number>();
  #socket?: WebSocket;
  #venueId?: PredictVenueId;
  #welcomed = false;
  #protocolRejected = false;
  #loggedMissingUrl = false;
  #reconnectAttempts = 0;
  #reconnectTimer?: TimerId;
  #lingerTimer?: TimerId;

  constructor({
    baseUrl,
    WebSocket: WebSocketImpl = global.WebSocket,
    onGameUpdate,
  }: PredictLiveDataClientOptions) {
    this.#url = parseStreamUrl(baseUrl);
    this.#WebSocket = WebSocketImpl;
    this.#onGameUpdate = onGameUpdate;
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

    if (!this.#isSocketLive()) {
      this.#socket = undefined;
      this.#welcomed = false;
      if (this.#reconnectTimer === undefined) {
        this.#connect();
      }
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
    }
    if (this.#watchCounts.size === 0) {
      this.#scheduleLinger();
    }

    return released;
  }

  disconnect(): void {
    this.#cancelReconnect();
    this.#cancelLinger();
    this.#watchCounts.clear();
    this.#welcomed = false;
    this.#venueId = undefined;
    this.#reconnectAttempts = 0;
    const socket = this.#socket;
    this.#socket = undefined;
    socket?.close();
  }

  destroy(): void {
    this.disconnect();
  }

  #isSocketLive(): boolean {
    const readyState = this.#socket?.readyState;
    return readyState === 0 || readyState === 1;
  }

  #connect(): void {
    if (this.#protocolRejected) {
      return;
    }
    const venueId = this.#venueId;
    if (!venueId || this.#isSocketLive()) {
      return;
    }
    if (!this.#url) {
      this.#logMissingUrlOnce();
      return;
    }

    const socket = new this.#WebSocket(this.#url);
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
    socket.onclose = () => {
      if (this.#socket !== socket) {
        return;
      }

      this.#socket = undefined;
      this.#welcomed = false;
      if (this.#watchCounts.size > 0) {
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
      this.#onGameUpdate(frame.game);
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

    this.#socket.send(
      JSON.stringify({
        type,
        topic: 'game',
        venueId,
        events: eventIds,
      }),
    );
  }

  #scheduleReconnect(): void {
    this.#cancelReconnect();
    if (this.#watchCounts.size === 0) {
      return;
    }

    this.#reconnectAttempts += 1;
    if (this.#reconnectAttempts > PREDICT_LIVE_DATA_MAX_RECONNECT_ATTEMPTS) {
      Logger.log(
        'PredictLiveDataClient: stopped reconnecting after max attempts',
      );
      return;
    }

    this.#reconnectTimer = setTimeout(() => {
      this.#reconnectTimer = undefined;
      this.#connect();
    }, this.#reconnectDelayMs());
  }

  #reconnectDelayMs(): number {
    const exponential = Math.min(
      PREDICT_LIVE_DATA_RECONNECT_MAX_MS,
      PREDICT_LIVE_DATA_RECONNECT_BASE_MS * 2 ** (this.#reconnectAttempts - 1),
    );
    return Math.round(exponential * (0.5 + Math.random() * 0.5));
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
}
