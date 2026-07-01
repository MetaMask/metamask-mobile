import { NativeModules } from 'react-native';
import type { RampsController } from '@metamask/ramps-controller';
import Logger from '../../../../util/Logger';

const DASHBOARD_PORT = 8099;
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
      orderId?: string | null;
      refreshTrigger?: 'websocket' | 'polling' | null;
      correlatedEventType?: string | null;
    }
  | {
      type: 'ws-status';
      connected: boolean;
      subscribedOrderIds: string[];
      timestamp: number;
    }
  | {
      type: 'ws-event';
      transakOrderId: string;
      status: string;
      eventType: string;
      timestamp: number;
    };

// Wraps globalThis.fetch at import time so that the proxy is installed
// before RampsService (or any other consumer) captures a reference to fetch.
const fetchUrlTracker = createFetchUrlTracker();

function parseHost(input: string | undefined | null): string | null {
  if (!input) {
    return null;
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    const match = trimmed.match(/^https?:\/\/([^/:]+)(?::\d+)?\//u);
    return match?.[1] ?? null;
  }

  return trimmed.replace(/:\d+$/u, '');
}

function getDashboardUrl(): string {
  const overrideHost = parseHost(
    (globalThis as { RAMPS_DEBUG_HOST?: string }).RAMPS_DEBUG_HOST,
  );
  if (overrideHost) {
    return `ws://${overrideHost}:${DASHBOARD_PORT}`;
  }

  const platformHost = parseHost(
    NativeModules?.PlatformConstants?.ServerHost ??
      NativeModules?.PlatformConstants?.serverHost,
  );
  if (platformHost) {
    return `ws://${platformHost}:${DASHBOARD_PORT}`;
  }

  const scriptURL =
    NativeModules?.SourceCode?.scriptURL ??
    NativeModules?.SourceCode?.bundleURL ??
    '';

  const scriptHost = parseHost(scriptURL);
  if (scriptHost) {
    return `ws://${scriptHost}:${DASHBOARD_PORT}`;
  }

  return `ws://localhost:${DASHBOARD_PORT}`;
}

/**
 * Initializes the debug bridge for the RampsController.
 * Subscribes to state changes and wraps controller methods to log calls,
 * then sends everything over WebSocket to the debug dashboard.
 *
 * Only call this in __DEV__ mode after opting in via `RAMPS_DEBUG_DASHBOARD=true`.
 * Fetch is patched at module load (not lazily) so the proxy is installed before
 * RampsService captures a reference to globalThis.fetch.
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
      const dashboardUrl = getDashboardUrl();

      // React Native WebSocket supports a third arg for options (including headers)
      // but the TS types don't include it, so we cast through unknown.
      const RNWebSocket = WebSocket as unknown as new (
        url: string,
        protocols: undefined,
        options: { headers: Record<string, string> },
      ) => WebSocket;

      Logger.log('[RampsDebug] Connecting to debug dashboard at', dashboardUrl);

      ws = new RNWebSocket(dashboardUrl, undefined, {
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
      sendWsStatus();
    });
  } catch (e) {
    Logger.log('[RampsDebug] Failed to subscribe to state changes:', e);
  }

  const PENDING_STATUSES = new Set([
    'PENDING',
    'CREATED',
    'UNKNOWN',
    'PRECREATED',
  ]);

  let wsConnected = false;

  function extractTransakOrderId(providerOrderId: string): string {
    if (providerOrderId.startsWith('/providers/')) {
      const parts = providerOrderId.split('/');
      return parts[parts.length - 1];
    }
    return providerOrderId;
  }

  function sendWsStatus() {
    try {
      const orders = (
        controller.state as unknown as {
          orders?: {
            providerOrderId: string;
            status: string;
            provider?: { id?: string };
          }[];
        }
      ).orders;

      const subscribedOrderIds = (orders ?? [])
        .filter((o) => {
          const providerId = o.provider?.id ?? '';
          return (
            providerId.includes('transak-native') &&
            PENDING_STATUSES.has(o.status)
          );
        })
        .map((o) => extractTransakOrderId(o.providerOrderId));

      send({
        type: 'ws-status',
        connected: wsConnected,
        subscribedOrderIds,
        timestamp: Date.now(),
      });
    } catch (e) {
      Logger.log('[RampsDebug] Failed to derive websocket status:', e);
    }
  }

  try {
    messenger.subscribe('TransakService:orderUpdate', (...args: unknown[]) => {
      const [data] = args as [
        { transakOrderId: string; status: string; eventType: string },
      ];

      wsConnected = true;
      send({
        type: 'ws-event',
        transakOrderId: data.transakOrderId,
        status: data.status,
        eventType: data.eventType,
        timestamp: Date.now(),
      });
      sendWsStatus();
    });
  } catch (e) {
    Logger.log(
      '[RampsDebug] Failed to subscribe to websocket order updates:',
      e,
    );
  }

  const WS_METHODS = new Set(['subscribeToTransakOrderUpdates']);

  wrapControllerMethods(controller, send, fetchUrlTracker, (methodName) => {
    if (WS_METHODS.has(methodName)) {
      wsConnected = true;
      sendWsStatus();
    }
  });
  connect();
  setTimeout(sendWsStatus, 1500);
  setInterval(sendWsStatus, 5000);
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

/**
 * Wraps globalThis.fetch to capture URLs matching ramps API patterns.
 * Uses an append-only log with method-to-URL-path matching so that
 * concurrent async method calls get the correct URL instead of
 * cross-contaminating via a shared drain buffer.
 */
function createFetchUrlTracker() {
  const log: { url: string; ts: number }[] = [];
  const originalFetch = globalThis.fetch;

  if (!originalFetch || typeof originalFetch !== 'function') {
    return {
      findUrl: () => null,
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
    if (url && RAMPS_URL_PATTERNS.some((p) => url.includes(p))) {
      log.push({ url, ts: Date.now() });
      if (log.length > 500) {
        log.splice(0, log.length - 200);
      }
    }
    return originalFetch.call(globalThis, input, init);
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

const WS_REFRESH_MATCH_WINDOW_MS = 5000;

function normalizeOrderId(value: unknown): string | null {
  if (typeof value !== 'string' || value.length === 0) {
    return null;
  }

  const match = value.match(/\/orders\/([^/?#]+)$/u);
  return match?.[1] ?? value;
}

function wrapControllerMethods(
  controller: RampsController,
  send: (msg: DebugMessage) => void,
  urlTracker: ReturnType<typeof createFetchUrlTracker>,
  onMethodCall?: (methodName: string) => void,
) {
  const recentWsEvents = new Map<
    string,
    { timestamp: number; eventType: string; status: string }
  >();

  try {
    const originalSend = send;
    send = (msg: DebugMessage) => {
      if (msg.type === 'ws-event') {
        recentWsEvents.set(msg.transakOrderId, {
          timestamp: msg.timestamp,
          eventType: msg.eventType,
          status: msg.status,
        });
      }
      originalSend(msg);
    };
  } catch {
    // Keep the original send function if wrapping fails for any reason.
  }

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
      onMethodCall?.(name);
      const start = Date.now();
      const requestsBefore = trackCache
        ? snapshotRequestTimestamps(controller)
        : null;
      const orderId = name === 'getOrder' ? normalizeOrderId(args[1]) : null;
      const correlatedEvent = orderId ? recentWsEvents.get(orderId) : null;
      const refreshTrigger =
        name === 'getOrder'
          ? correlatedEvent &&
            start - correlatedEvent.timestamp <= WS_REFRESH_MATCH_WINDOW_MS
            ? 'websocket'
            : 'polling'
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
          orderId,
          refreshTrigger,
          correlatedEventType: correlatedEvent?.eventType ?? null,
        });
        throw err;
      }

      const isPromiseLike =
        result &&
        typeof result === 'object' &&
        typeof (result as Promise<unknown>).then === 'function';

      if (isPromiseLike) {
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
              orderId,
              refreshTrigger,
              correlatedEventType: correlatedEvent?.eventType ?? null,
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
              orderId,
              refreshTrigger,
              correlatedEventType: correlatedEvent?.eventType ?? null,
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
          orderId,
          refreshTrigger,
          correlatedEventType: correlatedEvent?.eventType ?? null,
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
