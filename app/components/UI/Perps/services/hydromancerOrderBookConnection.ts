import type {
  OrderBookConnectionStatus,
  OrderBookData,
  OrderBookLevel,
} from '@metamask/perps-controller';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';

/**
 * PoC connection to the local Hydromancer order-book relay
 * (`hydromancer-orderbook-relay/`). The relay holds the vendor API key and
 * sends the app an `OrderBookData` snapshot. This socket never talks to
 * Hydromancer directly.
 *
 * Hardcoded for the iOS simulator: `localhost` is the Mac running the relay.
 */
const RELAY_URL = 'ws://localhost:8787';
const RECONNECT_MS = 1000;

export interface SubscribeHydromancerOrderBookParams {
  /** Market symbol (e.g. 'BTC'). Sent to the relay as `coin`. */
  symbol: string;
  /** Number of levels per side to keep. The relay sends 20. */
  levels?: number;
  /** Server-side price aggregation. The relay forwards this to Hydromancer. */
  nSigFigs?: 2 | 3 | 4 | 5;
  /** Mantissa refinement when `nSigFigs` is 5. */
  mantissa?: 2 | 5;
  /** Invoked with each snapshot from the relay. */
  callback: (data: OrderBookData) => void;
  /** Invoked when a sequence gap drops the book until the next snapshot. */
  onReset?: () => void;
  /** Invoked when the relay socket's health changes. */
  onStatusChange?: (status: OrderBookConnectionStatus) => void;
}

interface LiveHandler {
  levels: number;
  nSigFigs?: 2 | 3 | 4 | 5;
  mantissa?: 2 | 5;
  callback: (data: OrderBookData) => void;
  onReset?: () => void;
  onStatusChange?: (status: OrderBookConnectionStatus) => void;
}

interface RelayClientMessage {
  type: 'subscribe' | 'unsubscribe';
  coin: string;
  nSigFigs?: 2 | 3 | 4 | 5;
  mantissa?: 2 | 5;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isOrderBookLevel(value: unknown): value is OrderBookLevel {
  return (
    isRecord(value) &&
    typeof value.price === 'string' &&
    typeof value.size === 'string' &&
    typeof value.total === 'string' &&
    typeof value.notional === 'string' &&
    typeof value.totalNotional === 'string'
  );
}

function isOrderBookData(value: unknown): value is OrderBookData {
  return (
    isRecord(value) &&
    Array.isArray(value.bids) &&
    Array.isArray(value.asks) &&
    value.bids.every(isOrderBookLevel) &&
    value.asks.every(isOrderBookLevel) &&
    typeof value.spread === 'string' &&
    typeof value.spreadPercentage === 'string' &&
    typeof value.midPrice === 'string' &&
    typeof value.lastUpdated === 'number' &&
    typeof value.maxTotal === 'string'
  );
}

/**
 * One socket to the local relay, shared by every active market.
 */
export class HydromancerOrderBookConnection {
  #ws: WebSocket | null = null;
  #isSocketReady = false;
  #liveHandlers = new Map<string, LiveHandler>();
  #pendingQueue: RelayClientMessage[] = [];
  #reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  #closedByUs = false;

  /**
   * Subscribes to one coin on the relay.
   *
   * @returns An unsubscribe function.
   */
  subscribe({
    symbol,
    levels = 20,
    nSigFigs,
    mantissa,
    callback,
    onReset,
    onStatusChange,
  }: SubscribeHydromancerOrderBookParams): () => void {
    onStatusChange?.('connecting');
    this.#liveHandlers.set(symbol, {
      levels,
      nSigFigs,
      mantissa,
      callback,
      onReset,
      onStatusChange,
    });
    this.#send({ type: 'subscribe', coin: symbol, nSigFigs, mantissa });

    return () => {
      this.#liveHandlers.delete(symbol);
      this.#send({ type: 'unsubscribe', coin: symbol });
      if (this.#liveHandlers.size === 0) {
        this.close();
      }
    };
  }

  /** Closes the relay socket and drops every subscription. */
  close(): void {
    this.#closedByUs = true;
    if (this.#reconnectTimer) {
      clearTimeout(this.#reconnectTimer);
      this.#reconnectTimer = null;
    }
    this.#liveHandlers.clear();
    this.#pendingQueue = [];
    this.#ws?.close();
    this.#ws = null;
    this.#isSocketReady = false;
  }

  #send(message: RelayClientMessage): void {
    const ws = this.#ensureSocket();
    if (this.#isSocketReady && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
      return;
    }
    this.#pendingQueue.push(message);
  }

  #ensureSocket(): WebSocket {
    if (this.#ws) {
      return this.#ws;
    }

    this.#closedByUs = false;
    const ws = new WebSocket(RELAY_URL);

    ws.onopen = () => {
      this.#isSocketReady = true;
      const queued = this.#pendingQueue;
      this.#pendingQueue = [];
      queued.forEach((message) => ws.send(JSON.stringify(message)));
    };

    ws.onmessage = (event) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(String(event.data));
      } catch (error) {
        DevLogger.log('HydromancerOrderBookConnection: bad message', error);
        return;
      }
      if (!isRecord(parsed) || typeof parsed.coin !== 'string') {
        return;
      }

      const handler = this.#liveHandlers.get(parsed.coin);
      if (!handler) {
        return;
      }

      if (parsed.type === 'reset') {
        handler.onReset?.();
        return;
      }
      if (parsed.type === 'error') {
        handler.onStatusChange?.('error');
        return;
      }
      if (parsed.type !== 'l2Book' || !isOrderBookData(parsed.orderBook)) {
        return;
      }

      handler.onStatusChange?.('connected');
      handler.callback({
        ...parsed.orderBook,
        bids: parsed.orderBook.bids.slice(0, handler.levels),
        asks: parsed.orderBook.asks.slice(0, handler.levels),
      });
    };

    ws.onerror = (error) => {
      DevLogger.log('HydromancerOrderBookConnection: socket error', error);
    };

    ws.onclose = () => {
      // A grouping change closes this socket and opens the next one immediately.
      // Ignore the old close so it cannot drop the replacement.
      if (this.#ws !== ws) {
        return;
      }
      this.#ws = null;
      this.#isSocketReady = false;
      if (this.#closedByUs || this.#liveHandlers.size === 0) {
        return;
      }
      this.#liveHandlers.forEach((handler) =>
        handler.onStatusChange?.('connecting'),
      );
      this.#reconnectTimer = setTimeout(() => {
        this.#reconnectTimer = null;
        for (const [coin, handler] of this.#liveHandlers) {
          this.#send({
            type: 'subscribe',
            coin,
            nSigFigs: handler.nSigFigs,
            mantissa: handler.mantissa,
          });
        }
      }, RECONNECT_MS);
    };

    this.#ws = ws;
    return ws;
  }
}

let hydromancerOrderBookConnection: HydromancerOrderBookConnection | null =
  null;

export function getHydromancerOrderBookConnection(): HydromancerOrderBookConnection {
  if (!hydromancerOrderBookConnection) {
    hydromancerOrderBookConnection = new HydromancerOrderBookConnection();
  }
  return hydromancerOrderBookConnection;
}

/** Test-only: drop the singleton so the next call builds a fresh connection. */
export function resetHydromancerOrderBookConnectionForTesting(): void {
  hydromancerOrderBookConnection?.close();
  hydromancerOrderBookConnection = null;
}
