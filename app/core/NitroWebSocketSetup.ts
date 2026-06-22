/**
 * NitroWebSocketSetup — replaces global.WebSocket with react-native-nitro-websockets
 * and prewarms the MetaMask backend gateway connection on cold start.
 *
 * NitroWebSocket runs on native C++ (libwebsockets + mbedTLS) with no JS-bridge
 * overhead. The adapter below provides a W3C-compatible interface so the call
 * styles used across this codebase all work with no changes in consuming code:
 * - .onX property assignment — app code, @metamask/core-backend, Polymarket.
 * - addEventListener / removeEventListener with { once } and { signal } — @metamask/snaps-controllers, @nktkas/rews.
 * - dispatchEvent — @nktkas/rews (Perps / Hyperliquid transport).
 *
 * Install + prewarm are guarded by hasTestOverrides: under E2E, shim.js owns
 * global.WebSocket (it routes production wss:// URLs to local mock servers), so
 * this module must NOT overwrite that wrapper.
 *
 * https://fetch.margelo.com — "WebSockets"
 */
import {
  NitroWebSocket,
  prewarmOnAppStart,
  type WebSocketMessageEvent as NitroMessageEvent,
  type WebSocketCloseEvent as NitroCloseEvent,
} from 'react-native-nitro-websockets';
import { hasTestOverrides } from '../util/test/utils';

const GATEWAY_URL = 'wss://gateway.api.cx.metamask.io/v1';

type BinaryType = 'arraybuffer' | 'blob';

/** Maps the string-based WebSocketReadyState to W3C numeric constants. */
const READY_STATE_MAP: Record<string, number> = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
};

// W3C-shaped event objects dispatched to listeners. These are intentionally
// plain objects (not RN Event instances): the adapter owns dispatchEvent and
// never does an `instanceof Event` check, so consumers — including @nktkas/rews
// which dispatches its own CloseEvent onto the socket — interoperate by reading
// fields (type/data/code/reason/wasClean), not by identity.
interface WsEvent {
  type: string;
}
interface WsMessageEvent extends WsEvent {
  type: 'message';
  data: string | ArrayBuffer;
}
interface WsCloseEvent extends WsEvent {
  type: 'close';
  code: number;
  reason: string;
  wasClean: boolean;
}
interface WsErrorEvent extends WsEvent {
  type: 'error';
  message: string;
}
type WsAnyEvent = WsEvent | WsMessageEvent | WsCloseEvent | WsErrorEvent;

type WsListener = (event: WsAnyEvent) => void;
type EventType = 'open' | 'message' | 'close' | 'error';

type ListenerOptions = boolean | { once?: boolean; signal?: AbortSignal };

/**
 * W3C-compatible adapter over NitroWebSocket.
 *
 * Bridges the API styles that co-exist in this codebase and implements a
 * minimal EventTarget (addEventListener with { once }/{ signal }, removeEventListener,
 * dispatchEvent) so @nktkas/rews' reconnect/timeout paths work. Both .onX and
 * addEventListener listeners are dispatched from a single internal event loop
 * wired once in the constructor, so they compose correctly when mixed.
 */
class NitroWebSocketAdapter {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  // Instance-level copies for callers that read constants off the instance
  readonly CONNECTING = 0;
  readonly OPEN = 1;
  readonly CLOSING = 2;
  readonly CLOSED = 3;

  private readonly _ws: NitroWebSocket;

  // Registered listeners keyed by identity so removeEventListener and dedup are
  // O(1); the meta records { once } so a one-shot listener removes itself after
  // firing.
  private readonly _listeners: Record<
    EventType,
    Map<WsListener, { once: boolean }>
  > = {
    open: new Map(),
    message: new Map(),
    close: new Map(),
    error: new Map(),
  };

  // .onX property handlers (stored separately so they compose with _listeners)
  private _onopen: WsListener | null = null;
  private _onmessage: WsListener | null = null;
  private _onclose: WsListener | null = null;
  private _onerror: WsListener | null = null;

  // Accepted but not acted on — stored so downstream code that reads it back
  // gets a consistent value. NitroWebSocket always returns ArrayBuffer for
  // binary frames regardless of this setting.
  binaryType: BinaryType = 'arraybuffer';

  constructor(
    url: string,
    protocols?: string | string[],
    headers?: Record<string, string>,
  ) {
    this._ws = new NitroWebSocket(url, protocols, headers);

    // Each native callback builds a W3C-shaped event and routes it through
    // dispatchEvent, which invokes the matching .onX handler AND every
    // addEventListener listener.
    this._ws.onopen = () => {
      this.dispatchEvent({ type: 'open' });
    };

    this._ws.onmessage = (e: NitroMessageEvent) => {
      this.dispatchEvent({
        type: 'message',
        data: e.isBinary ? (e.binaryData ?? e.data) : e.data,
      });
    };

    this._ws.onclose = (e: NitroCloseEvent) => {
      this.dispatchEvent({
        type: 'close',
        code: e.code,
        reason: e.reason,
        wasClean: e.wasClean,
      });
    };

    this._ws.onerror = (error: string) => {
      this.dispatchEvent({ type: 'error', message: error });
    };
  }

  get readyState(): number {
    return READY_STATE_MAP[this._ws.readyState] ?? READY_STATE_MAP.CLOSED;
  }

  // ── pass-through getters ──────────────────────────────────────────────────

  get url(): string {
    return this._ws.url;
  }

  get protocol(): string {
    return this._ws.protocol;
  }

  get bufferedAmount(): number {
    return this._ws.bufferedAmount;
  }

  get extensions(): string {
    return this._ws.extensions;
  }

  // ── .onX property handlers ────────────────────────────────────────────────

  get onopen(): WsListener | null {
    return this._onopen;
  }
  set onopen(handler: WsListener | null) {
    this._onopen = handler;
  }

  get onmessage(): WsListener | null {
    return this._onmessage;
  }
  set onmessage(handler: WsListener | null) {
    this._onmessage = handler;
  }

  get onclose(): WsListener | null {
    return this._onclose;
  }
  set onclose(handler: WsListener | null) {
    this._onclose = handler;
  }

  get onerror(): WsListener | null {
    return this._onerror;
  }
  set onerror(handler: WsListener | null) {
    this._onerror = handler;
  }

  // ── EventTarget ───────────────────────────────────────────────────────────

  addEventListener(
    type: EventType,
    listener: WsListener,
    options?: ListenerOptions,
  ): void {
    const map = this._listeners[type];
    if (!map) return;

    const once =
      typeof options === 'object' && options !== null && !!options.once;
    const signal =
      typeof options === 'object' && options !== null
        ? options.signal
        : undefined;

    // Already-aborted signal: never register (matches DOM semantics).
    if (signal?.aborted) return;

    // Dedup by listener identity (matches addEventListener's no-op on repeats).
    if (map.has(listener)) return;
    map.set(listener, { once });

    // { signal }: remove the listener when the signal aborts. @nktkas/rews
    // relies on this to tear down its open/message/close/error listeners.
    signal?.addEventListener('abort', () => map.delete(listener), {
      once: true,
    });
  }

  removeEventListener(type: EventType, listener: WsListener): void {
    this._listeners[type]?.delete(listener);
  }

  /**
   * Dispatches an event to the matching .onX handler and all registered
   * listeners. Used internally by the native callbacks and externally by
   * @nktkas/rews (which dispatches a synthetic CloseEvent on connect timeout /
   * close-during-connecting). Returns true (no event is cancelable here).
   */
  dispatchEvent(event: WsAnyEvent): boolean {
    const type = event.type as EventType;

    const onHandler = this._onHandlerFor(type);
    onHandler?.(event);

    const map = this._listeners[type];
    if (map) {
      // Snapshot first: a listener may add/remove listeners during dispatch.
      for (const [listener, meta] of [...map]) {
        if (meta.once) map.delete(listener);
        listener(event);
      }
    }

    return true;
  }

  private _onHandlerFor(type: EventType): WsListener | null {
    switch (type) {
      case 'open':
        return this._onopen;
      case 'message':
        return this._onmessage;
      case 'close':
        return this._onclose;
      case 'error':
        return this._onerror;
      default:
        return null;
    }
  }

  // ── methods ───────────────────────────────────────────────────────────────

  send(data: string | ArrayBuffer): void {
    this._ws.send(data);
  }

  close(code?: number, reason?: string): void {
    this._ws.close(code, reason);
  }
}

/**
 * Installs the Nitro WebSocket adapter as global.WebSocket and prewarms the
 * MetaMask backend gateway. Skipped under E2E (hasTestOverrides) so shim.js's
 * mock-routing WebSocket wrapper stays in place.
 */
export function installProductionNitroWebSocket(): void {
  global.WebSocket = NitroWebSocketAdapter as unknown as typeof WebSocket;

  // Persist the MetaMask backend gateway URL for native prewarm on every
  // subsequent cold start. Android fires stored URLs via
  // NitroWebSocketAutoPrewarmer.prewarmOnStart (MainApplication.kt); iOS is
  // auto-bootstrapped via the Nitro +load hook. Polymarket channels are
  // on-demand and not prewarmed.
  try {
    prewarmOnAppStart(GATEWAY_URL);
  } catch {
    // Non-fatal: a prewarm failure means a cold connection on next use, not a
    // broken socket — never let it break app boot.
  }
}

if (!hasTestOverrides) {
  installProductionNitroWebSocket();
}

export { NitroWebSocketAdapter };
