import type { RampsController } from '@metamask/ramps-controller';

const DASHBOARD_URL = 'ws://localhost:8099';
const RECONNECT_DELAY_MS = 3000;

const EXCLUDED_PROPS = new Set([
  'constructor',
  'name',
  'state',
  'metadata',
  'destroy',
  'clearPendingResourceCountForTest',
]);

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
    };

/**
 * Initializes the debug bridge for the RampsController.
 * Subscribes to state changes and wraps controller methods to log calls,
 * then sends everything over WebSocket to the debug dashboard.
 *
 * Only call this in __DEV__ mode.
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
      // React Native WebSocket supports a third arg for options (including headers)
      // but the TS types don't include it, so we cast through unknown.
      const RNWebSocket = WebSocket as unknown as new (
        url: string,
        protocols: undefined,
        options: { headers: Record<string, string> },
      ) => WebSocket;

      ws = new RNWebSocket(DASHBOARD_URL, undefined, {
        headers: { 'X-Ramps-Debug-Source': 'mobile' },
      });

      ws.onopen = () => {
        // eslint-disable-next-line no-console
        console.log('[RampsDebug] Connected to debug dashboard');

        send({
          type: 'state',
          state: controller.state as unknown as Record<string, unknown>,
          patches: [],
          timestamp: Date.now(),
        });

        for (const raw of pendingMessages) {
          ws?.send(raw);
        }
        pendingMessages = [];
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
    // eslint-disable-next-line no-console
    console.warn('[RampsDebug] Failed to subscribe to state changes:', e);
  }

  // Wrap controller methods with a Proxy to log calls
  wrapControllerMethods(controller, send);

  // Start the connection
  connect();
}

function wrapControllerMethods(
  controller: RampsController,
  send: (msg: DebugMessage) => void,
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

    ctrl[name] = function (...args: unknown[]) {
      const start = Date.now();
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
        });
        throw err;
      }

      const isPromiseLike =
        result &&
        typeof result === 'object' &&
        typeof (result as Promise<unknown>).then === 'function';

      if (isPromiseLike) {
        (result as Promise<unknown>).then(
          (resolved) => {
            send({
              type: 'method',
              name,
              args: sanitizeArgs(args),
              result: sanitizeResult(resolved),
              duration: Date.now() - start,
              timestamp: Date.now(),
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
            });
          },
        );
      } else {
        send({
          type: 'method',
          name,
          args: sanitizeArgs(args),
          result: sanitizeResult(result),
          duration: Date.now() - start,
          timestamp: Date.now(),
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
      return JSON.parse(str.slice(0, 5000) + '..."');
    }
    return JSON.parse(str);
  } catch {
    return String(result);
  }
}

function safeStringify(value: unknown): string {
  const seen = new WeakSet();
  return JSON.stringify(value, (_key, val) => {
    if (val !== null && typeof val === 'object') {
      if (seen.has(val)) return '[Circular]';
      seen.add(val);
    }
    if (typeof val === 'bigint') return val.toString();
    if (typeof val === 'function')
      return `[Function: ${val.name || 'anonymous'}]`;
    if (val instanceof Error) return { message: val.message, stack: val.stack };
    return val;
  });
}
