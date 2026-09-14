import {
  parsePredictLiveDataServerFrame,
  type PredictGameLive,
  type PredictLiveDataServerFrame,
} from '../../contracts/v1/liveData';
import type { PredictEntityId, PredictVenueId } from '../../types';

const LIVE_DATA_PATH = '/v1/stream/live-data';
const PROTOCOL_VERSION = 1;

type WebSocketConstructor = typeof WebSocket;

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
    const url = new URL(LIVE_DATA_PATH, baseUrl);
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
    this.#venueId = venueId;
    const fresh: PredictEntityId[] = [];
    eventIds.forEach((eventId) => {
      const held = this.#watchCounts.get(eventId) ?? 0;
      this.#watchCounts.set(eventId, held + 1);
      if (held === 0) {
        fresh.push(eventId);
      }
    });

    if (!this.#socket) {
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
    }
    if (this.#watchCounts.size === 0) {
      this.disconnect();
    }

    return released;
  }

  disconnect(): void {
    this.#watchCounts.clear();
    this.#welcomed = false;
    this.#venueId = undefined;
    this.#socket?.close();
    this.#socket = undefined;
  }

  destroy(): void {
    this.disconnect();
  }

  #connect(): void {
    const venueId = this.#venueId;
    if (!venueId || !this.#url || this.#socket) {
      return;
    }

    const socket = new this.#WebSocket(this.#url);
    this.#socket = socket;

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
        this.#connect();
      }
    };
  }

  #onFrame(frame: PredictLiveDataServerFrame, venueId: PredictVenueId): void {
    if (frame.type === 'welcome') {
      if (frame.protocol !== PROTOCOL_VERSION) {
        this.disconnect();
        return;
      }
      this.#welcomed = true;
      this.#sendSubscription('subscribe', venueId, [
        ...this.#watchCounts.keys(),
      ]);
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
}
