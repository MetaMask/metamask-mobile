import type { RampsController } from '@metamask/ramps-controller';
import Logger from '../../../../util/Logger';

/** Default dashboard WebSocket; use `adb reverse tcp:8099 tcp:8099` on Android so the app can reach the host. */
const DASHBOARD_WS_URL = 'ws://localhost:8099';
const RECONNECT_DELAY_MS = 3000;

const EXCLUDED_PROPS = new Set([
  'constructor',
  'name',
  'state',
  'metadata',
  'destroy',
  'clearPendingResourceCountForTest',
]);

type RequestsState = Record<
  string,
  { status: string; timestamp: number; lastFetchedAt: number }
>;

interface WidgetUrlRequestDetails {
  url: string;
  status?: number;
  statusText?: string;
  ok: boolean;
  error?: string;
  responseBody?: string;
  duration: number;
  timestamp: number;
}

type DebugMessage =
  | {
      type: 'state';
      state: Record<string, unknown>;
      patches: unknown[];
      timestamp: number;
    }
  | {
      type: 'method';
      name: string;
      args: unknown[];
      result?: unknown;
      error?: string;
      duration: number;
      timestamp: number;
      cacheStatus?: 'hit' | 'miss' | null;
      requestUrl?: string | null;
    }
  | {
      type: 'widget-url-request';
      details: WidgetUrlRequestDetails;
    };

/**
 * Initializes the debug bridge for the RampsController.
 * Subscribes to state changes and wraps controller methods to log calls,
 * then sends everything over WebSocket to the debug dashboard.
 *
 * Only call this in __DEV__ mode after opting in via `RAMPS_DEBUG_DASHBOARD=true`.
 * Fetch is patched here (not at module load) so requiring this module is side-effect free.
 *
 * @param controller - The RampsController instance.
 * @param messenger - The controller messenger to subscribe to state changes.
 */
export function initRampsDebugBridge(
  controller: RampsController,
  messenger: {
    subscribe: (event: string, handler: (...args: unknown[]) => void) => void;
  },
): void {
  const fetchUrlTracker = createFetchUrlTracker();

  let ws: WebSocket | null = null;
  let pendingMessages: string[] = [];

  function send(msg: DebugMessage) {
    const raw = safeStringify(msg);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(raw);
    } else {
      pendingMessages.push(raw);
      if (pendingMessages.length > 200) {
        pendingMessages = pendingMessages.slice(-100);
      }
    }
  }

  function connect() {
    try {
      // React Native WebSocket supports a third arg for options (including headers)
      // but the TS types don't include it, so we cast through unknown.
      const RNWebSocket = WebSocket as unknown as new (
        url: string,
        protocols: undefined,
        options: { headers: Record<string, string> },
      ) => WebSocket;

      ws = new RNWebSocket(DASHBOARD_WS_URL, undefined, {
        headers: { 'X-Ramps-Debug-Source': 'mobile' },
      });

      ws.onopen = () => {
        Logger.log('[RampsDebug] Connected to debug dashboard');

        // Flush queued messages first so stale `state` payloads from while
        // disconnected cannot overwrite the fresh snapshot sent next.
        for (const raw of pendingMessages) {
          ws?.send(raw);
        }
        pendingMessages = [];

        send({
          type: 'state',
          state: controller.state as unknown as Record<string, unknown>,
          patches: [],
          timestamp: Date.now(),
        });
      };

      ws.onclose = () => {
        ws = null;
        setTimeout(connect, RECONNECT_DELAY_MS);
      };

      ws.onerror = () => {
        ws?.close();
      };
    } catch {
      setTimeout(connect, RECONNECT_DELAY_MS);
    }
  }

  try {
    messenger.subscribe('RampsController:stateChange', (...args: unknown[]) => {
      const [state, patches] = args as [Record<string, unknown>, unknown[]];
      send({
        type: 'state',
        state,
        patches: patches || [],
        timestamp: Date.now(),
      });
    });
  } catch (e) {
    Logger.log('[RampsDebug] Failed to subscribe to state changes:', e);
  }

  fetchUrlTracker.registerWidgetCallback((details: WidgetUrlRequestDetails) => {
    send({ type: 'widget-url-request', details });
  });
  wrapControllerMethods(controller, send, fetchUrlTracker);
  connect();
}

const RAMPS_URL_PATTERNS = ['on-ramp', 'localhost:3000', '127.0.0.1:3000'];

const METHOD_URL_PATTERNS: Record<string, RegExp> = {
  getCountries: /regions\/countries/,
  getTokens: /topTokens/,
  getProviders: /regions\/[^/]+\/providers/,
  getPaymentMethods: /\/payments/,
  getQuotes: /\/quotes/,
  getBuyWidgetData: /buy-widget|buy-url/,
  getOrder: /providers\/[^/]+\/orders/,
  getOrderFromCallback: /\/callback/,
  init: /geolocation/,
  hydrateState: /geolocation/,
};

const WIDGET_URL_PATTERN = /buy-widget|buy-url/;

/**
 * Wraps globalThis.fetch to capture URLs matching ramps API patterns.
 * Uses an append-only log with method-to-URL-path matching so that
 * concurrent async method calls get the correct URL instead of
 * cross-contaminating via a shared drain buffer.
 *
 * Also intercepts widget URL requests (buy-widget, buy-url) to capture
 * full request/response details for debug dashboard visibility.
 */
function createFetchUrlTracker() {
  const log: { url: string; ts: number }[] = [];
  let widgetCallback: ((details: WidgetUrlRequestDetails) => void) | null =
    null;
  const originalFetch = globalThis.fetch;

  if (!originalFetch || typeof originalFetch !== 'function') {
    return {
      findUrl: () => null,
      registerWidgetCallback: (
        _cb: (details: WidgetUrlRequestDetails) => void,
      ) => undefined,
    };
  }

  globalThis.fetch = function rampsFetchDebugProxy(
    input: RequestInfo | URL,
    init?: RequestInit,
  ) {
    let url = '';
    try {
      url =
        input instanceof URL
          ? input.toString()
          : typeof input === 'string'
            ? input
            : (input as Request).url;
    } catch {
      // URL extraction failed — don't interfere with the request
    }
    const isRampsUrl = url && RAMPS_URL_PATTERNS.some((p) => url.includes(p));
    const isWidgetUrl =
      isRampsUrl && WIDGET_URL_PATTERN.test(url) && widgetCallback;

    let startTime = 0;
    if (isRampsUrl) {
      startTime = Date.now();
      log.push({ url, ts: startTime });
      if (log.length > 500) {
        log.splice(0, log.length - 200);
      }
    }

    const promise = originalFetch.call(globalThis, input, init);

    if (isWidgetUrl && widgetCallback) {
      const cb = widgetCallback;
      const start = startTime;
      promise
        .then(async (response) => {
          try {
            const duration = Date.now() - start;
            let responseBody: string | undefined;
            if (!response.ok) {
              try {
                const cloned = response.clone();
                responseBody = await cloned.text();
                if (responseBody.length > 2000) {
                  responseBody = responseBody.slice(0, 2000) + '...[truncated]';
                }
              } catch {
                responseBody = '[unable to read body]';
              }
            }
            cb({
              url,
              status: response.status,
              statusText: response.statusText,
              ok: response.ok,
              responseBody: response.ok ? undefined : responseBody,
              duration,
              timestamp: Date.now(),
            });
          } catch {
            // Swallow any error in our logging to avoid affecting the app
          }
        })
        .catch((err) => {
          try {
            cb({
              url,
              ok: false,
              error: err instanceof Error ? err.message : String(err),
              duration: Date.now() - start,
              timestamp: Date.now(),
            });
          } catch {
            // Swallow any error in our logging
          }
        });
    }

    return promise;
  } as typeof fetch;

  return {
    findUrl(methodName: string, since: number): string | null {
      const pattern = METHOD_URL_PATTERNS[methodName];
      let fallback: string | null = null;

      for (let i = log.length - 1; i >= 0; i--) {
        if (log[i].ts < since) break;
        if (!fallback) fallback = log[i].url;
        if (pattern && pattern.test(log[i].url)) {
          return log[i].url;
        }
      }

      return fallback;
    },
    registerWidgetCallback(cb: (details: WidgetUrlRequestDetails) => void) {
      widgetCallback = cb;
    },
  };
}

function snapshotRequestTimestamps(
  controller: RampsController,
): Map<string, number> {
  const requests = (controller.state as unknown as { requests?: RequestsState })
    .requests;
  const snap = new Map<string, number>();
  if (requests) {
    for (const [key, val] of Object.entries(requests)) {
      snap.set(key, val.timestamp);
    }
  }
  return snap;
}

function detectCacheStatus(
  controller: RampsController,
  before: Map<string, number>,
): 'hit' | 'miss' | null {
  const requests = (controller.state as unknown as { requests?: RequestsState })
    .requests;
  if (!requests) return null;

  for (const [key, val] of Object.entries(requests)) {
    const prevTs = before.get(key);
    if (prevTs === undefined || prevTs !== val.timestamp) {
      return 'miss';
    }
  }

  if (before.size !== Object.keys(requests).length) {
    return 'miss';
  }

  return 'hit';
}

const DATA_FETCH_METHODS = new Set([
  'getCountries',
  'getTokens',
  'getProviders',
  'getPaymentMethods',
  'getQuotes',
  'getBuyWidgetData',
  'getOrder',
  'getOrderFromCallback',
  'init',
  'hydrateState',
]);

function wrapControllerMethods(
  controller: RampsController,
  send: (msg: DebugMessage) => void,
  urlTracker: ReturnType<typeof createFetchUrlTracker>,
) {
  const proto = Object.getPrototypeOf(controller);
  const methodNames = Object.getOwnPropertyNames(proto).filter((name) => {
    if (EXCLUDED_PROPS.has(name)) return false;
    if (name.startsWith('_')) return false;
    try {
      return (
        typeof (controller as unknown as Record<string, unknown>)[name] ===
        'function'
      );
    } catch {
      return false;
    }
  });

  for (const name of methodNames) {
    const ctrl = controller as unknown as Record<
      string,
      (...a: unknown[]) => unknown
    >;
    const original = ctrl[name].bind(controller);
    const trackCache = DATA_FETCH_METHODS.has(name);

    ctrl[name] = function (...args: unknown[]) {
      const start = Date.now();
      const requestsBefore = trackCache
        ? snapshotRequestTimestamps(controller)
        : null;

      let result: unknown;

      try {
        result = original(...args);
      } catch (err) {
        send({
          type: 'method',
          name,
          args: sanitizeArgs(args),
          error: err instanceof Error ? err.message : String(err),
          duration: Date.now() - start,
          timestamp: Date.now(),
          cacheStatus: trackCache ? 'miss' : null,
          requestUrl: trackCache ? urlTracker.findUrl(name, start) : null,
        });
        throw err;
      }

      const isPromiseLike =
        result &&
        typeof result === 'object' &&
        typeof (result as Promise<unknown>).then === 'function';

      if (isPromiseLike) {
        // onRejected mirrors the sync catch block so failures show in the dashboard,
        // and it satisfies the derived promise so React Native __DEV__ does not log a
        // spurious unhandled rejection (callers still get the original promise).
        // eslint-disable-next-line @typescript-eslint/no-floating-promises -- debug-only side effect; original promise is still returned to callers
        (result as Promise<unknown>).then(
          (resolved) => {
            const cacheStatus =
              trackCache && requestsBefore
                ? detectCacheStatus(controller, requestsBefore)
                : null;
            send({
              type: 'method',
              name,
              args: sanitizeArgs(args),
              result: sanitizeResult(resolved),
              duration: Date.now() - start,
              timestamp: Date.now(),
              cacheStatus,
              requestUrl: trackCache ? urlTracker.findUrl(name, start) : null,
            });
          },
          (err) => {
            send({
              type: 'method',
              name,
              args: sanitizeArgs(args),
              error: err instanceof Error ? err.message : String(err),
              duration: Date.now() - start,
              timestamp: Date.now(),
              cacheStatus: trackCache ? 'miss' : null,
              requestUrl: trackCache ? urlTracker.findUrl(name, start) : null,
            });
          },
        );
      } else {
        const cacheStatus =
          trackCache && requestsBefore
            ? detectCacheStatus(controller, requestsBefore)
            : null;
        send({
          type: 'method',
          name,
          args: sanitizeArgs(args),
          result: sanitizeResult(result),
          duration: Date.now() - start,
          timestamp: Date.now(),
          cacheStatus,
          requestUrl: trackCache ? urlTracker.findUrl(name, start) : null,
        });
      }

      return result;
    };
  }
}

function sanitizeArgs(args: unknown[]): unknown[] {
  try {
    return JSON.parse(safeStringify(args));
  } catch {
    return args.map((a) => String(a));
  }
}

function sanitizeResult(result: unknown): unknown {
  if (result === undefined) return undefined;
  try {
    const str = safeStringify(result);
    if (str.length > 5000) {
      return {
        _truncated: true,
        length: str.length,
        preview: str.slice(0, 5000),
      };
    }
    return JSON.parse(str);
  } catch {
    return String(result);
  }
}

function safeStringify(value: unknown): string {
  // Track the current ancestor stack so that shared references (e.g. selected
  // pointing to the same object inside data[]) are serialised normally, while
  // true back-references (cycles) are replaced with '[Circular]'.
  const ancestors: object[] = [];

  return JSON.stringify(value, function replacer(this: unknown, _key, val) {
    if (typeof val === 'bigint') return val.toString();
    if (typeof val === 'function')
      return `[Function: ${val.name || 'anonymous'}]`;
    if (val instanceof Error) return { message: val.message, stack: val.stack };

    if (val !== null && typeof val === 'object') {
      while (ancestors.length > 0 && ancestors[ancestors.length - 1] !== this) {
        ancestors.pop();
      }

      if (ancestors.includes(val)) return '[Circular]';
      ancestors.push(val);
    }

    return val;
  });
}
