import { getActiveSpan, spanToJSON, startSpan, type Span } from '@sentry/core';
import NavigationService from '../../core/NavigationService';
import {
  ENDPOINT_ATTRIBUTE,
  REDUNDANT_ATTRIBUTE,
  RPC_METHOD_ATTRIBUTE,
  createRedundancyTracker,
  fingerprintRequest,
  getEndpointLabel,
  getRpcMethod,
} from './networkSpanAttributes';

/**
 * Attributes added to every `http.client` span when the request starts.
 *
 * `route.name` is the focused screen. `connection_type` is the NetInfo type
 * (wifi, cellular, none, …). Both are read at `fetch` time, which is when
 * Sentry parents the span. Reading them later, when the span is sent, would
 * record wherever the user had navigated in the meantime.
 */
export const OUTGOING_REQUEST_ROUTE_ATTRIBUTE = 'route.name';
export const OUTGOING_REQUEST_CONNECTION_ATTRIBUTE = 'connection_type';

interface ConnectionState {
  type?: string | null;
}

interface ConnectionSource {
  addEventListener: (listener: (state: ConnectionState) => void) => () => void;
  fetch: () => Promise<ConnectionState>;
}

export interface OutgoingRequestSpanClient {
  on: (
    hook: 'beforeOutgoingRequestSpan',
    // The SDK passes an XHR or a fetch hint; a fetch hint carries the call arguments.
    callback: (span: Span, hint?: unknown) => void,
  ) => () => void;
}

interface OutgoingRequestContext {
  routeName?: string;
  connectionType?: string;
}

let annotatedClients = new WeakSet<object>();
let connectionListenerStarted = false;
let connectionType: string | undefined;
let fetchParentInstalled = false;
let originalFetch: typeof fetch | undefined;
let isRedundantRequest = createRedundancyTracker();

/**
 * Clears module state. Test-only.
 */
export function resetOutgoingRequestAnnotationForTesting(): void {
  annotatedClients = new WeakSet();
  connectionListenerStarted = false;
  connectionType = undefined;
  fetchParentInstalled = false;
  isRedundantRequest = createRedundancyTracker();
  if (originalFetch) {
    global.fetch = originalFetch;
    originalFetch = undefined;
  }
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/** The body of a fetch call, read from the hint's call arguments. */
function readFetchBody(hint: unknown): unknown {
  const input = (hint as { input?: unknown } | undefined)?.input;
  if (!Array.isArray(input)) return undefined;
  return (input[1] as { body?: unknown } | undefined)?.body;
}

/**
 * Adds what makes a request analysable without exposing it: the normalized
 * endpoint, the JSON-RPC method, and whether the same call was just made.
 * The url and method come from the span, so this covers fetch and XHR; the
 * JSON-RPC method comes from the fetch body when there is one.
 */
export function annotateNetworkRequestSpan(span: Span, hint?: unknown): void {
  const data = spanToJSON(span).data ?? {};
  const url =
    readString(data.url) ??
    readString(data['url.full']) ??
    readString(data['http.url']);
  if (!url) return;

  const method =
    readString(data['http.method']) ??
    readString(data['http.request.method']) ??
    'GET';
  const body = readFetchBody(hint);

  span.setAttribute(ENDPOINT_ATTRIBUTE, getEndpointLabel(method, url));
  const rpcMethod = getRpcMethod(body);
  if (rpcMethod) {
    span.setAttribute(RPC_METHOD_ATTRIBUTE, rpcMethod);
  }
  if (isRedundantRequest(fingerprintRequest(method, url, body))) {
    span.setAttribute(REDUNDANT_ATTRIBUTE, true);
  }
}

export function annotateOutgoingRequestSpan(
  span: Span,
  context: OutgoingRequestContext,
): void {
  if (context.routeName) {
    span.setAttribute(OUTGOING_REQUEST_ROUTE_ATTRIBUTE, context.routeName);
  }
  if (context.connectionType) {
    span.setAttribute(
      OUTGOING_REQUEST_CONNECTION_ATTRIBUTE,
      context.connectionType,
    );
  }
}

/**
 * Subscribes once per Sentry client. The callback runs inside the SDK's fetch
 * and XHR hooks, before the request is sent.
 */
export function registerOutgoingRequestAnnotation(
  client: OutgoingRequestSpanClient,
): void {
  if (annotatedClients.has(client)) {
    return;
  }
  annotatedClients.add(client);
  ensureConnectionListener();

  client.on('beforeOutgoingRequestSpan', (span, hint) => {
    try {
      annotateOutgoingRequestSpan(span, {
        routeName: readRouteName(),
        connectionType,
      });
      annotateNetworkRequestSpan(span, hint);
    } catch {
      // Annotation must not change the request.
    }
  });
}

/**
 * Gives a nitro-fetch call a root span when nothing else is tracing.
 *
 * Sentry only sends an `http.client` span while another span is active. The
 * navigation span closes about a second after the screen settles, so later
 * requests were discarded. This parent stays open until that one response
 * finishes. Its op is `http.request` so the child `http.client` span remains
 * the single row in a request table.
 */
export function installStandaloneOutgoingFetchSpan(): void {
  if (fetchParentInstalled || typeof global.fetch !== 'function') {
    return;
  }

  const wrappedFetch = global.fetch.bind(global);
  originalFetch = global.fetch;
  fetchParentInstalled = true;

  global.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    try {
      if (getActiveSpan()) {
        return wrappedFetch(input, init);
      }

      const { method, url } = describeOutgoingFetch(input, init);
      return startSpan(
        {
          // Normalized, never the raw url: transaction names reach Sentry as-is
          // and per-name sample rates match on them.
          name: url ? getEndpointLabel(method, url) : method,
          op: 'http.request',
        },
        (span) => {
          annotateOutgoingRequestSpan(span, {
            routeName: readRouteName(),
            connectionType,
          });
          return wrappedFetch(input, init);
        },
      );
    } catch {
      return wrappedFetch(input, init);
    }
  }) as typeof fetch;
}

function describeOutgoingFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): { method: string; url: string } {
  const requestMethod =
    typeof Request !== 'undefined' && input instanceof Request
      ? input.method
      : undefined;
  const method = (init?.method ?? requestMethod ?? 'GET').toUpperCase();

  if (typeof input === 'string') {
    return { method, url: input };
  }
  if (input instanceof URL) {
    return { method, url: input.toString() };
  }
  if (typeof Request !== 'undefined' && input instanceof Request) {
    return { method, url: input.url };
  }
  return { method, url: '' };
}

function readRouteName(): string | undefined {
  try {
    const name = NavigationService.getCurrentRoute()?.name;
    return typeof name === 'string' && name.length > 0 ? name : undefined;
  } catch {
    return undefined;
  }
}

function ensureConnectionListener(): void {
  if (connectionListenerStarted) {
    return;
  }
  connectionListenerStarted = true;

  const source = loadConnectionSource();
  if (!source) {
    return;
  }

  try {
    source.addEventListener((state) => {
      rememberConnectionType(state?.type);
    });
    void source
      .fetch()
      .then((state) => {
        rememberConnectionType(state?.type);
      })
      .catch(() => undefined);
  } catch {
    // Connection type is optional context.
  }
}

function loadConnectionSource(): ConnectionSource | undefined {
  try {
    // Loaded lazily so Sentry setup does not import the native module unless
    // a client is actually being annotated.
    // eslint-disable-next-line @typescript-eslint/no-require-imports, import-x/no-commonjs
    return require('@react-native-community/netinfo')
      .default as ConnectionSource;
  } catch {
    return undefined;
  }
}

function rememberConnectionType(type: string | null | undefined): void {
  if (typeof type === 'string' && type.length > 0 && type !== 'unknown') {
    connectionType = type;
  }
}
