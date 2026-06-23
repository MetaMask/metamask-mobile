/**
 * Replaces global.WebSocket with react-native-nitro-websockets (libwebsockets + mbedTLS,
 * no JS-bridge overhead) and prewarms the MetaMask backend gateway on cold start.
 *
 * The adapter is W3C-compatible and supports all call styles used in this codebase:
 * - .onX assignment — app code, @metamask/core-backend, Polymarket
 * - addEventListener / removeEventListener with { once } / { signal } — @metamask/snaps-controllers, @nktkas/rews
 * - dispatchEvent — @nktkas/rews (Perps / Hyperliquid transport)
 *
 * Skipped under E2E (hasTestOverrides): shim.js owns global.WebSocket there and
 * routes production wss:// URLs to local mock servers.
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

// Maps NitroWebSocket's string readyState to W3C numeric constants.
const READY_STATE_MAP: Record<string, number> = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
};

// Plain W3C-shaped event objects — the adapter never does instanceof checks,
// so consumers (@nktkas/rews dispatches its own CloseEvent) interoperate by
// reading fields, not by identity.
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
 * Implements a minimal EventTarget (addEventListener with { once } / { signal },
 * removeEventListener, dispatchEvent) so @nktkas/rews reconnect/timeout paths work.
 * Both .onX and addEventListener listeners are dispatched from a single event loop
 * wired in the constructor, so they compose correctly when mixed.
 */
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

  // Listeners keyed by identity for O(1) dedup and removal; meta tracks { once }.
  private readonly _listeners: Record<
    EventType,
    Map<WsListener, { once: boolean }>
  > = {
    open: new Map(),
    message: new Map(),
    close: new Map(),
    error: new Map(),
  };

  // Tracks abort-cleanup handlers keyed by listener so they can be removed from
  // their AbortSignal when the socket closes (prevents signal holding stale refs).
  private readonly _abortCleanups: Map<WsListener, () => void> = new Map();

  // .onX handlers stored separately so they compose with _listeners.
  private _onopen: WsListener | null = null;
  private _onmessage: WsListener | null = null;
  private _onclose: WsListener | null = null;
  private _onerror: WsListener | null = null;

  // Accepted but unused — NitroWebSocket always returns ArrayBuffer for binary
  // frames regardless of this value; stored for read-back consistency.
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
        // binaryData holds the ArrayBuffer for binary frames; e.data is the
        // string-encoded fallback the native layer may set when binaryData is
        // absent (defensive — not currently observed in practice).
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
      // Remove abort handlers from their signals, then clear all maps so
      // GC can collect listeners and any closures they captured.
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

    if (signal?.aborted) return; // already-aborted signal: never register (DOM semantics)
    if (map.has(listener)) return; // dedup by identity (matches DOM no-op on repeats)
    map.set(listener, { once });

    if (signal) {
      // Remove listener when the signal aborts — @nktkas/rews relies on this to
      // tear down its open/message/close/error listeners.
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

  /**
   * Dispatches to the matching .onX handler and all registered listeners.
   * Called internally by native callbacks and externally by @nktkas/rews
   * (synthetic CloseEvent on connect timeout / close-during-connecting).
   *
   * W3C semantics: a throwing listener must not prevent remaining listeners
   * from running. Exceptions are swallowed after being reported to the global
   * error handler so the event loop stays intact.
   */
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
      // Snapshot before iterating: a listener may mutate the map during dispatch.
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

    // WebSocket events are not cancelable; always true per W3C spec.
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
    // ArrayBufferView (e.g. Uint8Array from @metamask/snaps-controllers): copy the
    // exact byte range into a real ArrayBuffer — sending .buffer directly would
    // include bytes outside the view's offset/length.
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
 * Installs NitroWebSocketAdapter as global.WebSocket and registers the MetaMask
 * backend gateway for native prewarm on each subsequent cold start.
 * Android: NitroWebSocketAutoPrewarmer.prewarmOnStart (MainApplication.kt).
 * iOS: auto-bootstrapped via the Nitro +load hook.
 */
export function installProductionNitroWebSocket(): void {
  global.WebSocket = NitroWebSocketAdapter as unknown as typeof WebSocket;

  try {
    prewarmOnAppStart(GATEWAY_URL);
  } catch {
    // Non-fatal: prewarm failure means a cold connection on next use, not a broken socket.
  }
}

if (!hasTestOverrides) {
  installProductionNitroWebSocket();
}

export { NitroWebSocketAdapter };
