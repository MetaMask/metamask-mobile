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
  baseUrl: string;
  WebSocket?: WebSocketConstructor;
  onGameUpdate: (game: PredictGameLive) => void;
}

/** Subscription surface the live-data service depends on. */
export interface PredictLiveDataTransport {
  subscribe(
    venueId: PredictVenueId,
    eventIds: readonly PredictEntityId[],
  ): void;
  unsubscribe(
    venueId: PredictVenueId,
    eventIds: readonly PredictEntityId[],
  ): void;
  destroy(): void;
}

export class PredictLiveDataClient implements PredictLiveDataTransport {
  readonly #url: string;
  readonly #WebSocket: WebSocketConstructor;
  readonly #onGameUpdate: (game: PredictGameLive) => void;
  readonly #eventIds = new Set<PredictEntityId>();
  #socket?: WebSocket;
  #welcomed = false;

  constructor({
    baseUrl,
    WebSocket: WebSocketImpl = global.WebSocket,
    onGameUpdate,
  }: PredictLiveDataClientOptions) {
    const url = new URL(LIVE_DATA_PATH, baseUrl);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';

    this.#url = url.toString();
    this.#WebSocket = WebSocketImpl;
    this.#onGameUpdate = onGameUpdate;
  }

  subscribe(
    venueId: PredictVenueId,
    eventIds: readonly PredictEntityId[],
  ): void {
    const fresh = eventIds.filter((eventId) => !this.#eventIds.has(eventId));
    fresh.forEach((eventId) => this.#eventIds.add(eventId));
    if (fresh.length === 0) {
      return;
    }

    if (!this.#socket) {
      this.#connect(venueId);
      return;
    }

    if (this.#welcomed) {
      this.#sendSubscription('subscribe', venueId, fresh);
    }
  }

  unsubscribe(
    venueId: PredictVenueId,
    eventIds: readonly PredictEntityId[],
  ): void {
    const held = eventIds.filter((eventId) => this.#eventIds.delete(eventId));
    if (held.length > 0 && this.#welcomed) {
      this.#sendSubscription('unsubscribe', venueId, held);
    }
    if (this.#eventIds.size === 0) {
      this.disconnect();
    }
  }

  disconnect(): void {
    this.#eventIds.clear();
    this.#welcomed = false;
    this.#socket?.close();
    this.#socket = undefined;
  }

  destroy(): void {
    this.disconnect();
  }

  #connect(venueId: PredictVenueId): void {
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
      if (this.#socket === socket) {
        this.#socket = undefined;
        this.#welcomed = false;
      }
    };
  }

  #onFrame(
    frame: PredictLiveDataServerFrame,
    venueId: PredictVenueId,
  ): void {
    if (frame.type === 'welcome') {
      if (frame.protocol !== PROTOCOL_VERSION) {
        this.disconnect();
        return;
      }
      this.#welcomed = true;
      this.#sendSubscription('subscribe', venueId, [...this.#eventIds]);
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
    if (!this.#socket || this.#socket.readyState !== 1 || eventIds.length === 0) {
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
