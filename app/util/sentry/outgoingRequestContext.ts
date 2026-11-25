import {
  getActiveSpan,
  startSpan,
  type Span,
  type SpanJSON,
} from '@sentry/core';
import NavigationService from '../../core/NavigationService';
import { getNetworkConditions } from '../deviceCapability/conditions';

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

/** Retain only bounded HTTP telemetry, not arbitrary SDK request details. */
export function redactOutgoingRequestSpan(span: SpanJSON): SpanJSON {
  if (span.op !== 'http.client') return span;
  const data = span.data;
  const method = safeMethod(
    data?.['http.request.method'] ?? data?.['http.method'],
  );
  return {
    ...span,
    description: method,
    data: {
      'http.method': method,
      'http.status_code': data?.['http.status_code'],
      'http.response.status_code': data?.['http.response.status_code'],
      'sentry.origin': data?.['sentry.origin'],
      [OUTGOING_REQUEST_ROUTE_ATTRIBUTE]:
        data?.[OUTGOING_REQUEST_ROUTE_ATTRIBUTE],
      [OUTGOING_REQUEST_CONNECTION_ATTRIBUTE]:
        data?.[OUTGOING_REQUEST_CONNECTION_ATTRIBUTE],
      'hardware.tier': data?.['hardware.tier'],
      'network.tier': data?.['network.tier'],
      'latency.bucket': data?.['latency.bucket'],
    },
  };
}

function safeMethod(value: unknown): string {
  const method = typeof value === 'string' ? value.toUpperCase() : '';
  return /^(GET|HEAD|POST|PUT|DELETE|CONNECT|OPTIONS|TRACE|PATCH)$/u.test(
    method,
  )
    ? method
    : 'HTTP';
}

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
    callback: (span: Span) => void,
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

/**
 * Clears module state. Test-only.
 */
export function resetOutgoingRequestAnnotationForTesting(): void {
  annotatedClients = new WeakSet();
  connectionListenerStarted = false;
  connectionType = undefined;
  fetchParentInstalled = false;
  if (originalFetch) {
    global.fetch = originalFetch;
    originalFetch = undefined;
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

  client.on('beforeOutgoingRequestSpan', (span) => {
    try {
      annotateOutgoingRequestSpan(span, {
        routeName: readRouteName(),
        connectionType,
      });
      const { hardware, network, latency } = getNetworkConditions();
      span.setAttribute('hardware.tier', hardware ?? 'UNKNOWN');
      span.setAttribute('network.tier', network ?? 'UNKNOWN');
      span.setAttribute('latency.bucket', latency);
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

      const requestMethod =
        typeof Request !== 'undefined' && input instanceof Request
          ? input.method
          : undefined;
      return startSpan(
        {
          name: safeMethod(init?.method ?? requestMethod ?? 'GET'),
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
