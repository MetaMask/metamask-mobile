import type {
  OrderBookConnectionStatus,
  OrderBookData,
} from '@metamask/perps-controller';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import type {
  HydromancerL2BookMessage,
  HydromancerL2BookSubscribeRequest,
} from '../types/hydromancer';
import {
  createMockHydromancerL2BookMessage,
  HYDROMANCER_BLOCK_MS,
  HYDROMANCER_MAX_LEVELS,
  processHydromancerOrderBook,
} from '../utils/hydromancerOrderBook';

/**
 * Dedicated connection for the Hydromancer `l2Book` order-book PoC — the
 * first vendor feed named in the "Perps HyperLiquid order-book depth
 * investigation" doc as a path to 20 levels/side under Hyperliquid's own
 * `fast`/slow cadence trade-off.
 *
 * Kept separate from `AggregatedOrderBookConnection` (Hyperliquid) so this
 * PoC can be wired, toggled, and torn down independently of the shipped
 * order-book paths — see `../hooks/stream/usePerpsLiveOrderBook.ts`'s
 * `'orderBookHydromancer'` channel.
 *
 * Two modes, selected automatically by whether an API key is configured. With
 * no key (default today), a local mock timer emits snapshots shaped exactly
 * like the real feed (see `createMockHydromancerL2BookMessage`), so the
 * mapper, hook, and UI are fully wired and need no change once a real key
 * lands. With a key present, this opens the real
 * `wss://api.hydromancer.xyz/ws` socket and speaks the documented `l2Book`
 * subscribe/unsubscribe protocol.
 */

/** `.js.env` var. Empty/unset selects the mock feed. */
export const getHydromancerApiKey = (): string =>
  process.env.MM_PERPS_HYDROMANCER_API_KEY?.trim() ?? '';

/** Fallback mid price for the mock feed when no reference price is known yet. */
const DEFAULT_MOCK_MID_PRICE = 100;

/** Hydromancer only accepts these `nLevels` values; snap to the nearest. */
function toHydromancerNLevels(levels: number): 1 | 10 | 20 | 50 {
  if (levels <= 1) return 1;
  if (levels <= 10) return 10;
  if (levels <= 20) return 20;
  return 50;
}

export interface SubscribeHydromancerOrderBookParams {
  /** Market symbol (e.g. 'BTC'). */
  symbol: string;
  /** Number of levels per side to keep (default: 20, this PoC's goal depth). */
  levels?: number;
  /** Server-side aggregation significant figures (real feed only). */
  nSigFigs?: 2 | 3 | 4 | 5;
  /** Mantissa refinement when `nSigFigs` is 5 (real feed only). */
  mantissa?: 2 | 5;
  /**
   * Seeds the mock feed's starting mid price (e.g. the market's last known
   * price). Ignored once a real key/feed is in use — the vendor snapshot
   * carries its own price. Falls back to `DEFAULT_MOCK_MID_PRICE`.
   */
  referencePrice?: number;
  /** Invoked with each processed snapshot. */
  callback: (data: OrderBookData) => void;
  /** Invoked when the underlying feed's health changes. */
  onStatusChange?: (status: OrderBookConnectionStatus) => void;
}

interface LiveHandler {
  levels: number;
  nSigFigs?: 2 | 3 | 4 | 5;
  mantissa?: 2 | 5;
  callback: (data: OrderBookData) => void;
  onStatusChange?: (status: OrderBookConnectionStatus) => void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isHydromancerL2BookMessage(
  value: unknown,
): value is HydromancerL2BookMessage {
  return (
    isRecord(value) &&
    value.type === 'l2Book' &&
    isRecord(value.data) &&
    typeof value.data.coin === 'string' &&
    Array.isArray(value.data.levels)
  );
}

/**
 * Owns a dedicated Hydromancer WebSocket (real feed) or mock timers (no key)
 * for the order-book PoC's `l2Book` subscriptions, one per active coin.
 */
export class HydromancerOrderBookConnection {
  /** Real-feed socket. Created lazily on first subscription with a key. */
  #ws: WebSocket | null = null;
  /** Whether the socket has completed the `{type:'connected'}` handshake. */
  #isSocketReady = false;
  #liveHandlers = new Map<string, LiveHandler>();
  #mockTimers = new Map<string, ReturnType<typeof setInterval>>();
  /** Subscribe/unsubscribe messages queued until the socket is ready. */
  #pendingQueue: HydromancerL2BookSubscribeRequest[] = [];

  /**
   * Opens an `l2Book` subscription (real or mock, depending on whether
   * `MM_PERPS_HYDROMANCER_API_KEY` is set) for one coin.
   *
   * @returns An unsubscribe function.
   */
  subscribe(params: SubscribeHydromancerOrderBookParams): () => void {
    return getHydromancerApiKey()
      ? this.#subscribeLive(params)
      : this.#subscribeMock(params);
  }

  /** Closes the real-feed socket (if any) and clears all mock timers. */
  close(): void {
    this.#mockTimers.forEach((timer) => clearInterval(timer));
    this.#mockTimers.clear();
    this.#liveHandlers.clear();
    this.#ws?.close();
    this.#ws = null;
    this.#isSocketReady = false;
  }

  // --- Mock feed ---------------------------------------------------------

  #subscribeMock({
    symbol,
    levels = HYDROMANCER_MAX_LEVELS,
    referencePrice,
    callback,
    onStatusChange,
  }: SubscribeHydromancerOrderBookParams): () => void {
    onStatusChange?.('connecting');

    let seq = 0;
    let mid =
      referencePrice && referencePrice > 0
        ? referencePrice
        : DEFAULT_MOCK_MID_PRICE;
    let hasConnected = false;

    const emit = () => {
      seq += 1;
      // Small random walk so the mid price (and the ladder built around it)
      // visibly drifts block to block instead of jittering in place.
      mid *= 1 + (Math.random() - 0.5) * 0.0004;
      const message = createMockHydromancerL2BookMessage({
        coin: symbol,
        seq,
        midPrice: mid,
        levels,
      });
      if (!hasConnected) {
        hasConnected = true;
        onStatusChange?.('connected');
      }
      callback(processHydromancerOrderBook(message.data, levels));
    };

    // First snapshot lands on the next tick, mirroring the real feed's
    // "initial snapshot on subscribe" behavior rather than appearing instantly.
    emit();
    const timer = setInterval(emit, HYDROMANCER_BLOCK_MS);
    this.#mockTimers.set(symbol, timer);

    return () => {
      clearInterval(timer);
      this.#mockTimers.delete(symbol);
    };
  }

  // --- Real feed -----------------------------------------------------------

  #subscribeLive({
    symbol,
    levels = HYDROMANCER_MAX_LEVELS,
    nSigFigs,
    mantissa,
    callback,
    onStatusChange,
  }: SubscribeHydromancerOrderBookParams): () => void {
    onStatusChange?.('connecting');
    this.#liveHandlers.set(symbol, {
      levels,
      nSigFigs,
      mantissa,
      callback,
      onStatusChange,
    });

    const subscribeMessage: HydromancerL2BookSubscribeRequest = {
      method: 'subscribe',
      subscription: {
        type: 'l2Book',
        coins: [symbol],
        nSigFigs,
        mantissa,
        nLevels: toHydromancerNLevels(levels),
      },
    };
    this.#send(subscribeMessage);

    return () => {
      this.#liveHandlers.delete(symbol);
      this.#send({
        method: 'unsubscribe',
        subscription: { type: 'l2Book', coins: [symbol] },
      });
      if (this.#liveHandlers.size === 0) {
        this.close();
      }
    };
  }

  #ensureSocket(): WebSocket {
    if (this.#ws) {
      return this.#ws;
    }

    const token = getHydromancerApiKey();
    const ws = new WebSocket(`wss://api.hydromancer.xyz/ws?token=${token}`);

    ws.onmessage = (event) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(String(event.data));
      } catch (error) {
        DevLogger.log('HydromancerOrderBookConnection: bad message', error);
        return;
      }

      if (isRecord(parsed) && parsed.type === 'connected') {
        this.#isSocketReady = true;
        this.#flushQueue();
        return;
      }
      if (isRecord(parsed) && parsed.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
        return;
      }
      if (!isHydromancerL2BookMessage(parsed)) {
        return;
      }

      const handler = this.#liveHandlers.get(parsed.data.coin);
      if (!handler) {
        return;
      }
      handler.onStatusChange?.('connected');
      handler.callback(
        processHydromancerOrderBook(parsed.data, handler.levels),
      );
    };

    ws.onerror = (error) => {
      DevLogger.log('HydromancerOrderBookConnection: socket error', error);
      this.#liveHandlers.forEach((handler) =>
        handler.onStatusChange?.('error'),
      );
    };

    ws.onclose = () => {
      this.#ws = null;
      this.#isSocketReady = false;
      this.#liveHandlers.forEach((handler) =>
        handler.onStatusChange?.('error'),
      );
    };

    this.#ws = ws;
    return ws;
  }

  #send(message: HydromancerL2BookSubscribeRequest): void {
    const ws = this.#ensureSocket();
    if (this.#isSocketReady && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
      return;
    }
    this.#pendingQueue.push(message);
  }

  #flushQueue(): void {
    const ws = this.#ws;
    if (!ws) {
      return;
    }
    const queued = this.#pendingQueue;
    this.#pendingQueue = [];
    queued.forEach((message) => ws.send(JSON.stringify(message)));
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
