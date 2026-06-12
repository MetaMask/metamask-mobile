/**
 * NitroWebSocketSetup — replaces global.WebSocket with react-native-nitro-websockets
 * and prewarms the MetaMask backend gateway connection on cold start.
 *
 * NitroWebSocket runs on native C++ (libwebsockets + mbedTLS) with no JS-bridge
 * overhead. The adapter below provides a complete W3C-compatible interface so
 * ALL call styles work — .onX property assignment AND addEventListener — with
 * no changes required in any consuming code.
 *
 * https://fetch.margelo.com — "WebSockets"
 */
import {
  NitroWebSocket,
  prewarmOnAppStart,
  type WebSocketMessageEvent as NitroMessageEvent,
  type WebSocketCloseEvent as NitroCloseEvent,
} from 'react-native-nitro-websockets';

type BinaryType = 'arraybuffer' | 'blob';

/** Maps the string-based WebSocketReadyState to W3C numeric constants. */
const READY_STATE_MAP: Record<string, number> = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
};

type OpenListener = () => void;
type MessageListener = (e: { data: string | ArrayBuffer }) => void;
type CloseListener = (e: NitroCloseEvent) => void;
type ErrorListener = (error: string) => void;
type AnyListener =
  | OpenListener
  | MessageListener
  | CloseListener
  | ErrorListener;

/**
 * Full W3C-compatible adapter over NitroWebSocket.
 *
 * Bridges two API styles that co-exist in this codebase:
 * - .onX property assignment  (used by app code and @metamask/core-backend)
 * - addEventListener / removeEventListener  (used by @metamask/snaps-controllers)
 *
 * Both styles dispatch through the same internal event loop wired once in the
 * constructor, so they compose correctly when mixed on the same socket.
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

  // Multi-listener sets backing addEventListener / removeEventListener
  private readonly _listeners = {
    open: new Set<OpenListener>(),
    message: new Set<MessageListener>(),
    close: new Set<CloseListener>(),
    error: new Set<ErrorListener>(),
  };

  // .onX property handlers (stored separately so they compose with _listeners)
  private _onopen: OpenListener | null = null;
  private _onmessage: MessageListener | null = null;
  private _onclose: CloseListener | null = null;
  private _onerror: ErrorListener | null = null;

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

    // Wire a single internal handler per event type. Both .onX and
    // addEventListener listeners are dispatched from here.
    this._ws.onopen = () => {
      this._onopen?.();
      this._listeners.open.forEach((fn) => fn());
    };

    this._ws.onmessage = (e: NitroMessageEvent) => {
      const event = { data: e.isBinary ? (e.binaryData ?? e.data) : e.data };
      this._onmessage?.(event);
      this._listeners.message.forEach((fn) => fn(event));
    };

    this._ws.onclose = (e: NitroCloseEvent) => {
      this._onclose?.(e);
      this._listeners.close.forEach((fn) => fn(e));
    };

    this._ws.onerror = (error: string) => {
      this._onerror?.(error);
      this._listeners.error.forEach((fn) => fn(error));
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

  get onopen(): OpenListener | null {
    return this._onopen;
  }
  set onopen(handler: OpenListener | null) {
    this._onopen = handler;
  }

  get onmessage(): MessageListener | null {
    return this._onmessage;
  }
  set onmessage(handler: MessageListener | null) {
    this._onmessage = handler;
  }

  get onclose(): CloseListener | null {
    return this._onclose;
  }
  set onclose(handler: CloseListener | null) {
    this._onclose = handler;
  }

  get onerror(): ErrorListener | null {
    return this._onerror;
  }
  set onerror(handler: ErrorListener | null) {
    this._onerror = handler;
  }

  // ── addEventListener / removeEventListener ────────────────────────────────

  addEventListener(type: 'open', listener: OpenListener): void;
  addEventListener(type: 'message', listener: MessageListener): void;
  addEventListener(type: 'close', listener: CloseListener): void;
  addEventListener(type: 'error', listener: ErrorListener): void;
  addEventListener(type: string, listener: AnyListener): void {
    const set = this._listeners[type as keyof typeof this._listeners] as
      | Set<AnyListener>
      | undefined;
    set?.add(listener);
  }

  removeEventListener(type: 'open', listener: OpenListener): void;
  removeEventListener(type: 'message', listener: MessageListener): void;
  removeEventListener(type: 'close', listener: CloseListener): void;
  removeEventListener(type: 'error', listener: ErrorListener): void;
  removeEventListener(type: string, listener: AnyListener): void {
    const set = this._listeners[type as keyof typeof this._listeners] as
      | Set<AnyListener>
      | undefined;
    set?.delete(listener);
  }

  // ── methods ───────────────────────────────────────────────────────────────

  send(data: string | ArrayBuffer): void {
    this._ws.send(data);
  }

  close(code?: number, reason?: string): void {
    this._ws.close(code, reason);
  }
}

global.WebSocket = NitroWebSocketAdapter as unknown as typeof WebSocket;

// Persist the MetaMask backend gateway URL for native prewarm on every subsequent
// cold start. Android fires stored URLs via NitroWebSocketAutoPrewarmer.prewarmOnStart
// (MainApplication.kt); iOS is auto-bootstrapped via the Nitro +load hook.
// Polymarket channels are on-demand and not prewarmed.
prewarmOnAppStart('wss://gateway.api.cx.metamask.io/v1');
