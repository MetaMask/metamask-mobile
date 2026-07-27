// Replaces global.WebSocket with NitroWebSocket (native C++ via libwebsockets).
// W3C-compatible: supports .onX, addEventListener/removeEventListener ({ once } / { signal }), dispatchEvent.
import {
  NitroWebSocket,
  type WebSocketMessageEvent as NitroMessageEvent,
  type WebSocketCloseEvent as NitroCloseEvent,
} from 'react-native-nitro-websockets';
import { hasTestOverrides } from '../util/test/utils';

type BinaryType = 'arraybuffer' | 'blob';

// Maps NitroWebSocket's string readyState to W3C numeric constants.
const READY_STATE_MAP: Record<string, number> = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
};

// Plain W3C-shaped event objects — no instanceof checks, field-based interop.
interface WsEvent {
  type: string;
}
interface WsMessageEvent extends WsEvent {
  type: 'message';
  data: string | ArrayBuffer;
  origin: string;
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

class NitroWebSocketAdapter {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  // Instance-level copies for callers that read constants off the instance.
  readonly CONNECTING = 0;
  readonly OPEN = 1;
  readonly CLOSING = 2;
  readonly CLOSED = 3;

  private readonly _ws: NitroWebSocket;

  private readonly _listeners: Record<
    EventType,
    Map<WsListener, { once: boolean }>
  > = {
    open: new Map(),
    message: new Map(),
    close: new Map(),
    error: new Map(),
  };

  // Keyed abort-cleanup handlers — removed from their signals on socket close.
  private readonly _abortCleanups: Map<WsListener, () => void> = new Map();

  // .onX handlers stored separately so they compose with _listeners.
  private _onopen: WsListener | null = null;
  private _onmessage: WsListener | null = null;
  private _onclose: WsListener | null = null;
  private _onerror: WsListener | null = null;

  binaryType: BinaryType = 'arraybuffer';

  constructor(
    url: string,
    protocols?: string | string[],
    headers?: Record<string, string>,
  ) {
    this._ws = new NitroWebSocket(url, protocols, headers);

    this._ws.onopen = () => {
      this.dispatchEvent({ type: 'open' });
    };

    this._ws.onmessage = (e: NitroMessageEvent) => {
      this.dispatchEvent({
        type: 'message',
        data: e.isBinary ? (e.binaryData ?? e.data) : e.data,
        origin: '',
      });
    };

    this._ws.onclose = (e: NitroCloseEvent) => {
      this.dispatchEvent({
        type: 'close',
        code: e.code,
        reason: e.reason,
        wasClean: e.wasClean,
      });
      // Clean up abort handlers and listener maps on close.
      this._abortCleanups.forEach((cleanup) => cleanup());
      this._abortCleanups.clear();
      for (const map of Object.values(this._listeners)) map.clear();
    };

    this._ws.onerror = (error: string) => {
      this.dispatchEvent({ type: 'error', message: error });
    };
  }

  get readyState(): number {
    const state = READY_STATE_MAP[this._ws.readyState];
    if (state === undefined) {
      if (__DEV__) {
        console.warn(
          `[NitroWS] Unknown readyState "${this._ws.readyState}" — reporting CLOSED`,
        );
      }
      return READY_STATE_MAP.CLOSED;
    }
    return state;
  }

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

    if (signal?.aborted) return;
    if (map.has(listener)) return;
    map.set(listener, { once });

    if (signal) {
      const abortCleanup = () => {
        map.delete(listener);
        this._abortCleanups.delete(listener);
      };
      this._abortCleanups.set(listener, () =>
        signal.removeEventListener('abort', abortCleanup),
      );
      signal.addEventListener('abort', abortCleanup, { once: true });
    }
  }

  removeEventListener(type: EventType, listener: WsListener): void {
    this._listeners[type]?.delete(listener);
  }

  // Dispatches to .onX handler + all registered listeners; throwing listeners are isolated.
  dispatchEvent(event: WsAnyEvent): boolean {
    const type = event.type as EventType;

    const onHandler = this._onHandlerFor(type);
    if (onHandler) {
      try {
        onHandler(event);
      } catch (e) {
        // Non-fatal: report but continue dispatching to other listeners.
        console.error('[NitroWS] Uncaught error in .on handler:', e);
      }
    }

    const map = this._listeners[type];
    if (map) {
      for (const [listener, meta] of [...map]) {
        if (meta.once) map.delete(listener);
        try {
          listener(event);
        } catch (e) {
          // Non-fatal: report but continue dispatching to remaining listeners.
          console.error('[NitroWS] Uncaught error in event listener:', e);
        }
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

  send(data: string | ArrayBuffer | ArrayBufferView): void {
    if (ArrayBuffer.isView(data)) {
      this._ws.send(
        data.buffer.slice(
          data.byteOffset,
          data.byteOffset + data.byteLength,
        ) as ArrayBuffer,
      );
      return;
    }
    this._ws.send(data);
  }

  close(code?: number, reason?: string): void {
    this._ws.close(code, reason);
  }
}

/**
 * Hosts that must use React Native's built-in WebSocket instead of Nitro.
 *
 * The Android native layer of react-native-nitro-websockets
 * (WebSocketConnection.cpp `connect()`) requests a `nitro-ws` subprotocol
 * (libwebsockets transmits `lws_client_connect_info.protocol` as the
 * `Sec-WebSocket-Protocol` request header) and sends an `Origin` header set
 * to the server's own host on every connection whose caller asked for no
 * subprotocol. Strict servers reject that handshake. The WalletConnect relay
 * is one of them: the socket never opens, `pairing.pair()` never settles, and
 * every WalletConnect connection hangs on the loading sheet (WAPI-1574,
 * regression shipped in 8.3.0 via #32472). Lenient endpoints (e.g.
 * HyperLiquid feeds) ignore the extra headers, which is why other websocket
 * features work.
 *
 * Route these hosts through the built-in WebSocket until the native layer
 * stops fabricating those headers.
 */
const NITRO_INCOMPATIBLE_HOSTS = new Set([
  'relay.walletconnect.org',
  'relay.walletconnect.com',
]);

// Dependency-free hostname extraction (mirrors the native parseUrl): the URL
// polyfill may not be installed yet when this module is evaluated.
function getWsHostname(url: string): string {
  const schemeEnd = url.indexOf('://');
  if (schemeEnd === -1) return '';
  const hostPort = url.slice(schemeEnd + 3).split(/[/?#]/)[0];
  return hostPort.split(':')[0].toLowerCase();
}

function isNitroIncompatibleUrl(url: string): boolean {
  return NITRO_INCOMPATIBLE_HOSTS.has(getWsHostname(url));
}

type RNWebSocketConstructor = new (
  url: string,
  protocols?: string | string[],
  options?: unknown,
) => WebSocket;

// Builds a WebSocket constructor that sends matching URLs to the Nitro
// adapter and everything else to the built-in implementation.
function createRoutingWebSocket(
  BuiltInWebSocket: RNWebSocketConstructor,
  useNitro: (url: string) => boolean,
): typeof WebSocket {
  function RoutingWebSocket(
    url: string,
    protocols?: string | string[],
    optionsOrHeaders?: unknown,
  ) {
    if (typeof url === 'string' && useNitro(url)) {
      return new NitroWebSocketAdapter(
        url,
        protocols,
        optionsOrHeaders as Record<string, string> | undefined,
      );
    }
    return new BuiltInWebSocket(url, protocols, optionsOrHeaders);
  }
  Object.assign(RoutingWebSocket, {
    CONNECTING: 0,
    OPEN: 1,
    CLOSING: 2,
    CLOSED: 3,
  });
  return RoutingWebSocket as unknown as typeof WebSocket;
}

export function installProductionNitroWebSocket(): void {
  const BuiltInWebSocket = global.WebSocket as unknown as
    | RNWebSocketConstructor
    | undefined;

  if (!BuiltInWebSocket) {
    global.WebSocket = NitroWebSocketAdapter as unknown as typeof WebSocket;
    return;
  }

  global.WebSocket = createRoutingWebSocket(
    BuiltInWebSocket,
    (url) => !isNitroIncompatibleUrl(url),
  );
}

// Dev builds additionally route by scheme: ws:// → RN built-in (Metro HMR,
// LogBox), wss:// → Nitro. Metro's HMRClient uses global.WebSocket after
// startup, so a blanket replacement breaks hot reload.
export function installDevNitroWebSocket(): void {
  const BuiltInWebSocket = global.WebSocket as unknown as
    | RNWebSocketConstructor
    | undefined;

  if (!BuiltInWebSocket) {
    global.WebSocket = NitroWebSocketAdapter as unknown as typeof WebSocket;
    return;
  }

  global.WebSocket = createRoutingWebSocket(
    BuiltInWebSocket,
    (url) => /^wss:/i.test(url) && !isNitroIncompatibleUrl(url),
  );
}

if (!hasTestOverrides) {
  if (__DEV__) {
    installDevNitroWebSocket();
  } else {
    installProductionNitroWebSocket();
  }
}

export { NitroWebSocketAdapter };
