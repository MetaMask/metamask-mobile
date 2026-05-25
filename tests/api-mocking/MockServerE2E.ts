// eslint-disable-next-line @typescript-eslint/no-shadow
import {
  getLocal,
  type ClientError,
  type CompletedRequest,
  type CompletedResponse,
  type Headers as MockttpHeaders,
  type InitiatedRequest,
  Mockttp,
  type TlsHandshakeFailure,
  type WebSocketClose,
  type WebSocketMessage,
} from 'mockttp';
// eslint-disable-next-line import-x/no-nodejs-modules
import { existsSync } from 'fs';
import { ALLOWLISTED_HOSTS, ALLOWLISTED_URLS } from './mock-e2e-allowlist.ts';
import { SUPPRESSED_LOGS_URLS } from './mock-config/suppressed-logs.ts';
import { createLogger, LogLevel } from '../framework/logger.ts';
import {
  E2E_PROXY_CA_CERT_PEM_PATH,
  E2E_PROXY_CA_KEY_PATH,
} from '../framework/utils/E2EProxyCa.ts';
import {
  MockApiEndpoint,
  MockEventsObject,
  PlatformDetector,
  Resource,
  ServerStatus,
  TestSpecificMock,
} from '../framework';
import {
  findMatchingPostEvent,
  processPostRequestBody,
  setupAccountsV2SupportedNetworksMock,
  setupAccountsV4TransactionsMock,
} from './helpers/mockHelpers.ts';
import { getLocalHost } from '../framework/fixtures/FixtureUtils.ts';
import PortManager, { ResourceType } from '../framework/PortManager.ts';
import {
  FALLBACK_GANACHE_PORT,
  FALLBACK_DAPP_SERVER_PORT,
} from '../framework/Constants.ts';
import { DEFAULT_ANVIL_PORT } from '../seeder/anvil-manager.ts';
import { logLiveMetaMetricsPostIfDebug } from '../helpers/analytics/analyticsDebug.ts';

const logger = createLogger({
  name: 'MockServer',
  level: LogLevel.INFO,
});

// ---------------------------------------------------------------------------
// Patch mockttp's matchesAll so aborted requests don't become unhandled
// rejections.
//
// findMatchingRule() starts ALL rules matching concurrently (.map) but awaits
// them one-by-one. When the first match succeeds it returns, abandoning the
// rest. If any of those reject (streamToBuffer → Error('Aborted') from a
// client disconnect), they become unhandled rejections that Jest turns into
// test failures.
//
// This patch catches only Error('Aborted') and returns false ("no match").
// All other errors propagate normally.
// ---------------------------------------------------------------------------
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mockttpMatchers = require('mockttp/dist/rules/matchers');
  const originalMatchesAll = mockttpMatchers.matchesAll;
  mockttpMatchers.matchesAll = async function (
    ...args: Parameters<typeof originalMatchesAll>
  ) {
    try {
      return await originalMatchesAll.apply(this, args);
    } catch (e) {
      if (e instanceof Error && e.message === 'Aborted') {
        return false;
      }
      throw e;
    }
  };
} catch (e) {
  logger.warn('Failed to patch mockttp matchesAll:', e);
}

/**
 * Safely reads request body text, catching abort errors.
 * When a client drops a connection mid-request (e.g., app navigation, AbortController),
 * mockttp's streamToBuffer rejects with Error('Aborted'). This wrapper catches those
 * errors and returns undefined instead of letting them bubble up as unhandled rejections.
 *
 * @param request - The mockttp request object
 * @returns The body text or undefined if reading failed or was aborted
 */
export const safeGetBodyText = async (request: {
  body: { getText: () => Promise<string | undefined> };
}): Promise<string | undefined> => {
  try {
    return await request.body.getText();
  } catch (error) {
    if (error instanceof Error && error.message === 'Aborted') {
      logger.debug('Request body read aborted (client disconnected)');
      return undefined;
    }
    logger.warn('Failed to read request body:', error);
    return undefined;
  }
};

interface LiveRequest {
  url: string;
  method: string;
  timestamp: string;
}

interface JsonRpcLikeMessage {
  id?: unknown;
  method?: unknown;
  result?: unknown;
  error?: unknown;
}

export interface InternalMockServer extends Mockttp {
  _liveRequests?: LiveRequest[];
}

export type HttpProxyTrafficSource = 'shim-proxy' | 'device-proxy';

export interface NormalizedHttpProxyRequest {
  source: HttpProxyTrafficSource;
  targetUrl: string;
  method: string;
  headers: MockttpHeaders;
  bodyText?: string;
  requestBodyJson?: unknown;
}

interface NormalizedHttpProxyRequestOptions {
  events: MockEventsObject;
  liveRequests?: LiveRequest[];
  forwardRequest?: typeof handleDirectFetch;
  getForwardUrl?: (targetUrl: string, source: HttpProxyTrafficSource) => string;
}

/**
 * Translates fallback ports to actual allocated ports in URLs.
 * This allows the MockServer (running on host) to forward requests to dynamically allocated local resources.
 *
 * @param url - The URL that may contain a fallback port
 * @returns The URL with fallback port replaced by actual allocated port, or original URL
 */
const translateFallbackPortToActual = (url: string): string => {
  try {
    const parsedUrl = new URL(url);
    const port = parsedUrl.port;

    if (!port) {
      return url;
    }

    const portNum = parseInt(port, 10);
    const portManager = PortManager.getInstance();
    let actualPort: number | undefined;

    // Map fallback ports to actual allocated ports
    // Try Ganache first, fallback to Anvil if Ganache not running
    if (portNum === FALLBACK_GANACHE_PORT) {
      actualPort = portManager.getPort(ResourceType.GANACHE);
      if (actualPort === undefined) {
        actualPort = portManager.getPort(ResourceType.ANVIL);
      }
    } else if (portNum === DEFAULT_ANVIL_PORT) {
      actualPort = portManager.getPort(ResourceType.ANVIL);
    } else if (
      portNum >= FALLBACK_DAPP_SERVER_PORT &&
      portNum < FALLBACK_DAPP_SERVER_PORT + 100
    ) {
      // Dapp server ports start at FALLBACK_DAPP_SERVER_PORT (8085, 8086, etc.)
      const dappIndex = portNum - FALLBACK_DAPP_SERVER_PORT;
      actualPort = portManager.getMultiInstancePort(
        ResourceType.DAPP_SERVER,
        `dapp-server-${dappIndex}`,
      );
    }

    if (actualPort !== undefined) {
      parsedUrl.port = actualPort.toString();
      const translatedUrl = parsedUrl.toString();
      logger.info(`Port translation: ${url} → ${translatedUrl}`);
      return translatedUrl;
    }

    return url;
  } catch (error) {
    logger.warn('Failed to parse URL for port translation:', url, error);
    return url;
  }
};

const isUrlAllowed = (url: string): boolean => {
  try {
    if (ALLOWLISTED_URLS.includes(url)) {
      return true;
    }

    // Malformed npm: package URIs that leak through the snap proxy
    // e.g. https://https//npm:@metamask/... or npm:@metamask/...
    if (/^(?:https?:\/\/.*)?npm[:@]@?metamask\//.test(url)) {
      return true;
    }

    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname;

    if (parsedUrl.protocol === 'data:') {
      return true;
    }

    return ALLOWLISTED_HOSTS.some((allowedHost) => {
      if (allowedHost.startsWith('*.')) {
        const domain = allowedHost.slice(2);
        return hostname === domain || hostname.endsWith(`.${domain}`);
      }
      return hostname === allowedHost;
    });
  } catch (error) {
    logger.warn('Invalid URL:', url);
    return false;
  }
};

const isUrlSuppressedFromLogs = (url: string): boolean =>
  SUPPRESSED_LOGS_URLS.some((pattern: RegExp) => pattern.test(url));

const isShimProxyRequest = (pathOrUrl?: string): boolean =>
  pathOrUrl?.startsWith('/proxy') ?? false;

const getDetectedPlatform = (): 'android' | 'ios' | undefined => {
  try {
    return PlatformDetector.getPlatform();
  } catch {
    return undefined;
  }
};

export const getProxyForwardUrl = (
  targetUrl: string,
  source: HttpProxyTrafficSource,
): string => {
  const platform = getDetectedPlatform();
  const platformAdjustedUrl =
    source === 'shim-proxy' && platform === 'android'
      ? targetUrl.replace('localhost', '127.0.0.1')
      : targetUrl;

  return translateFallbackPortToActual(platformAdjustedUrl);
};

const getRequestHost = (request: {
  hostname?: string;
  headers?: MockttpHeaders;
}): string => {
  const headerHost = request.headers?.host;
  return (
    request.hostname ||
    (Array.isArray(headerHost) ? headerHost[0] : headerHost) ||
    'unknown'
  );
};

const isSolanaRelatedHttpCandidate = (urlOrHost: string): boolean => {
  const value = urlOrHost.toLowerCase();
  return (
    value.includes('solana') ||
    value.includes('slip44:501') ||
    value.includes('5eykt4usfv8p8njdtrepy1vzqkqzkvdp')
  );
};

const JSON_RPC_BALANCE_METHODS = new Set([
  'getBalance',
  'getTokenAccountBalance',
  'getTokenAccountsByOwner',
  'getMultipleAccounts',
  'getAccountInfo',
]);

const redactNativeProxyUrl = (url: string): string => {
  try {
    const parsedUrl = new URL(url);

    if (parsedUrl.hostname.endsWith('infura.io')) {
      const pathSegments = parsedUrl.pathname.split('/').filter(Boolean);
      parsedUrl.pathname =
        pathSegments.length > 0
          ? `/${pathSegments.map(() => '<redacted>').join('/')}`
          : '/';
      parsedUrl.search = parsedUrl.search ? '?<redacted>' : '';
    }

    return parsedUrl.toString();
  } catch {
    return url;
  }
};

const parseJsonRpcMessages = (message: string): JsonRpcLikeMessage[] => {
  try {
    const parsed = JSON.parse(message) as
      | JsonRpcLikeMessage
      | JsonRpcLikeMessage[];
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [];
  }
};

const summarizeWebSocketMessage = (
  message: WebSocketMessage,
): {
  summary: string;
  methods: string[];
  isBalanceCandidate: boolean;
} => {
  if (message.isBinary) {
    return {
      summary: `binaryBytes=${message.content.byteLength}`,
      methods: [],
      isBalanceCandidate: false,
    };
  }

  const body = Buffer.from(message.content).toString('utf8');
  const parsedMessages = parseJsonRpcMessages(body);

  if (parsedMessages.length === 0) {
    return {
      summary: `bytes=${body.length} non-json`,
      methods: [],
      isBalanceCandidate: false,
    };
  }

  const methods = parsedMessages
    .map((entry) => entry.method)
    .filter((method): method is string => typeof method === 'string');
  const ids = parsedMessages
    .map((entry) => entry.id)
    .filter((id) => id !== undefined)
    .map((id) => String(id));
  const hasResult = parsedMessages.some((entry) => entry.result !== undefined);
  const hasError = parsedMessages.some((entry) => entry.error !== undefined);
  const summaryParts = [
    `messages=${parsedMessages.length}`,
    methods.length ? `methods=${Array.from(new Set(methods)).join(',')}` : '',
    ids.length ? `ids=${ids.slice(0, 5).join(',')}` : '',
    hasResult ? 'hasResult=true' : '',
    hasError ? 'hasError=true' : '',
  ].filter(Boolean);

  return {
    summary: summaryParts.join(' '),
    methods,
    isBalanceCandidate: methods.some((method) =>
      JSON_RPC_BALANCE_METHODS.has(method),
    ),
  };
};

const logSolanaRelatedHttpCandidate = (
  method: string,
  url: string,
  source: string,
): void => {
  if (!isSolanaRelatedHttpCandidate(url)) {
    return;
  }

  logger.warn(
    `[E2E_SOLANA_RELATED_HTTP_CANDIDATE] source=${source} ${method} ${url}`,
  );
};

const logNativeProxyRequestInitiated = (request: InitiatedRequest): void => {
  if (isShimProxyRequest(request.path)) {
    return;
  }

  logger.warn(
    `[E2E_NATIVE_PROXY_REQUEST_INITIATED] ${request.method} ${request.url} protocol=${request.protocol} host=${getRequestHost(request)}`,
  );
  logSolanaRelatedHttpCandidate(
    request.method,
    request.url,
    'request-initiated',
  );
};

const logNativeProxyTlsClientError = (request: TlsHandshakeFailure): void => {
  const host =
    request.hostname ||
    request.tlsMetadata.sniHostname ||
    request.tlsMetadata.connectHostname ||
    'unknown';

  logger.warn(
    `[E2E_NATIVE_PROXY_TLS_CLIENT_ERROR] host=${host} cause=${request.failureCause}`,
  );
  logSolanaRelatedHttpCandidate('TLS', host, 'tls-client-error');
};

const logNativeProxyClientError = (error: ClientError): void => {
  if (isShimProxyRequest(error.request.path)) {
    return;
  }

  logger.warn(
    `[E2E_NATIVE_PROXY_CLIENT_ERROR] ${error.request.method ?? 'UNKNOWN'} ${
      error.request.url ?? 'unknown-url'
    } errorCode=${error.errorCode ?? 'unknown'} response=${
      error.response === 'aborted' ? 'aborted' : error.response.statusCode
    }`,
  );
  logSolanaRelatedHttpCandidate(
    error.request.method ?? 'UNKNOWN',
    error.request.url ?? 'unknown-url',
    'client-error',
  );
};

const getMockttpProxyOptions = () => {
  if (
    existsSync(E2E_PROXY_CA_CERT_PEM_PATH) &&
    existsSync(E2E_PROXY_CA_KEY_PATH)
  ) {
    logger.warn(
      `[E2E_NATIVE_PROXY_HTTPS_ENABLED] Mockttp HTTPS interception using ${E2E_PROXY_CA_CERT_PEM_PATH}`,
    );

    return {
      https: {
        certPath: E2E_PROXY_CA_CERT_PEM_PATH,
        keyPath: E2E_PROXY_CA_KEY_PATH,
      },
      http2: 'fallback' as const,
    };
  }

  logger.warn(
    `[E2E_NATIVE_PROXY_HTTPS_DISABLED] Missing ${E2E_PROXY_CA_CERT_PEM_PATH} or ${E2E_PROXY_CA_KEY_PATH}; HTTPS native proxy traffic will not be decrypted`,
  );

  return {};
};

const handleDirectFetch = async (
  url: string,
  method: string,
  headers: MockttpHeaders,
  requestBody?: string,
): Promise<{ statusCode: number; body: string }> => {
  try {
    const fetchHeaders: HeadersInit = {};
    for (const [key, value] of Object.entries(headers)) {
      if (value) {
        fetchHeaders[key] = Array.isArray(value) ? value[0] : value;
      }
    }

    const response = await global.fetch(url, {
      method,
      headers: fetchHeaders,
      body: ['POST', 'PUT', 'PATCH'].includes(method) ? requestBody : undefined,
    });

    const responseBody = await response.text();
    return { statusCode: response.status, body: responseBody };
  } catch (error) {
    if (!isUrlSuppressedFromLogs(url)) {
      logger.error('Error forwarding request:', url, error);
    }
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to forward request' }),
    };
  }
};

const METHODS_WITH_REQUEST_BODY = new Set(['POST', 'PUT', 'PATCH']);

const methodCanHaveRequestBody = (method: string): boolean =>
  METHODS_WITH_REQUEST_BODY.has(method.toUpperCase());

const parseRequestBodyJson = (requestBodyText?: string): unknown => {
  if (!requestBodyText) {
    return undefined;
  }

  try {
    return JSON.parse(requestBodyText);
  } catch {
    return undefined;
  }
};

const findMatchingMockEvent = (
  events: MockEventsObject,
  method: string,
  targetUrl: string,
  requestBodyJson: unknown,
): MockApiEndpoint | undefined => {
  const methodEvents = events[method] || [];
  const candidateEvents = methodEvents.filter((event: MockApiEndpoint) => {
    const eventUrl = event.urlEndpoint;
    if (!eventUrl) return false;
    if (event.urlEndpoint instanceof RegExp) {
      return event.urlEndpoint.test(targetUrl);
    }
    const eventUrlStr = String(eventUrl);
    return targetUrl === eventUrlStr || targetUrl.startsWith(eventUrlStr);
  });

  if (candidateEvents.length === 0) {
    return undefined;
  }

  if (method === 'POST') {
    return findMatchingPostEvent(candidateEvents, requestBodyJson);
  }

  return candidateEvents[0];
};

const createMockEventResponse = (
  matchingEvent: MockApiEndpoint,
  request: NormalizedHttpProxyRequest,
): { statusCode: number; body: string } => {
  logger.debug(`Mocking ${request.method} request to: ${request.targetUrl}`);
  logger.debug(`Response status: ${matchingEvent.responseCode}`);
  logger.debug('Response:', matchingEvent.response);

  if (request.method === 'POST' && matchingEvent.requestBody) {
    const result = processPostRequestBody(
      request.bodyText,
      matchingEvent.requestBody,
      { ignoreFields: matchingEvent.ignoreFields || [] },
    );

    if (!result.matches) {
      return {
        statusCode: result.error === 'Missing request body' ? 400 : 404,
        body: JSON.stringify({
          error: result.error,
          expected: matchingEvent.requestBody,
          received: result.requestBodyJson,
        }),
      };
    }
  }

  return {
    statusCode: matchingEvent.responseCode,
    body:
      typeof matchingEvent.response === 'string'
        ? matchingEvent.response
        : JSON.stringify(matchingEvent.response),
  };
};

const logDirectDeviceProxyMiss = (
  method: string,
  targetUrl: string,
  requestBodyText?: string,
): void => {
  if (!isUrlSuppressedFromLogs(targetUrl)) {
    logger.warn(
      `[E2E_DEVICE_PROXY_UNMOCKED_REQUEST] source=device-proxy ${method} ${targetUrl} matchedMock=false liveRequestTracking=false`,
    );
    if (method === 'POST' && requestBodyText) {
      logger.warn(
        `[E2E_DEVICE_PROXY_UNMOCKED_REQUEST_BODY] ${requestBodyText}`,
      );
    }
  }
};

export const handleNormalizedHttpProxyRequest = async (
  request: NormalizedHttpProxyRequest,
  options: NormalizedHttpProxyRequestOptions,
): Promise<{ statusCode: number; body: string }> => {
  const method = request.method.toUpperCase();
  const requestBodyJson =
    request.requestBodyJson ?? parseRequestBodyJson(request.bodyText);
  const normalizedRequest = {
    ...request,
    method,
    requestBodyJson,
  };

  logSolanaRelatedHttpCandidate(method, request.targetUrl, request.source);

  if (method === 'POST') {
    logLiveMetaMetricsPostIfDebug(request.targetUrl, requestBodyJson);
  }

  const matchingEvent = findMatchingMockEvent(
    options.events,
    method,
    request.targetUrl,
    requestBodyJson,
  );

  if (matchingEvent) {
    return createMockEventResponse(matchingEvent, normalizedRequest);
  }

  const updatedUrl = options.getForwardUrl
    ? options.getForwardUrl(request.targetUrl, request.source)
    : request.targetUrl;

  if (request.source === 'device-proxy') {
    logDirectDeviceProxyMiss(method, updatedUrl, request.bodyText);
  } else if (!isUrlAllowed(updatedUrl)) {
    const errorMessage = `Request going to live server: ${updatedUrl}`;
    logger.warn(errorMessage);
    if (method === 'POST') {
      logger.warn(`Request Body: ${request.bodyText}`);
    }
    options.liveRequests?.push({
      url: updatedUrl,
      method,
      timestamp: new Date().toISOString(),
    });
  } else if (ALLOWLISTED_URLS.includes(updatedUrl)) {
    logger.warn(`Allowed URL: ${updatedUrl}`);
    if (method === 'POST') {
      logger.warn(`Request Body: ${request.bodyText}`);
    }
  }

  const forwardRequest = options.forwardRequest ?? handleDirectFetch;
  return await forwardRequest(
    updatedUrl,
    method,
    request.headers,
    methodCanHaveRequestBody(method) ? request.bodyText : undefined,
  );
};

export default class MockServerE2E implements Resource {
  _serverPort: number;
  _serverStatus: ServerStatus = ServerStatus.STOPPED;
  private _server: InternalMockServer | null = null;
  private _events: MockEventsObject;
  private _testSpecificMock?: TestSpecificMock;
  private _activeRequests = 0;
  private _shuttingDown = false;
  private _abortFilterHandler: ((...args: unknown[]) => void) | null = null;
  private _abortExceptionHandler: ((...args: unknown[]) => void) | null = null;
  private _abortSuppressCount = 0;
  private _originalRejectionHandlers: ((...args: unknown[]) => void)[] = [];
  private _originalExceptionHandlers: ((...args: unknown[]) => void)[] = [];
  private _webSocketUrlsByStreamId = new Map<string, string>();

  constructor(params: {
    events: MockEventsObject;
    testSpecificMock?: TestSpecificMock;
  }) {
    this._events = params.events;
    this._serverPort = 0; // Will be set when starting the server
    this._testSpecificMock = params.testSpecificMock;
  }

  isStarted(): boolean {
    return this._serverStatus === ServerStatus.STARTED;
  }

  getServerPort(): number {
    return this._serverPort;
  }

  getServerStatus(): ServerStatus {
    return this._serverStatus;
  }

  get getServerUrl(): string {
    return `http://${getLocalHost()}:${this._serverPort}`;
  }

  get server(): InternalMockServer {
    if (!this._server) {
      throw new Error('Mock server not started');
    }
    return this._server;
  }

  setServerPort(port: number): void {
    this._serverPort = port;
  }

  async start(): Promise<void> {
    if (this._serverStatus === ServerStatus.STARTED) {
      logger.debug('Mock server already started');
      return;
    }

    this._server = getLocal(getMockttpProxyOptions()) as InternalMockServer;
    this._server._liveRequests = [];
    await this._server.start(this._serverPort);

    logger.info(
      `Mockttp server running at http://${getLocalHost()}:${this._serverPort}`,
    );

    await this._server.on('request-initiated', logNativeProxyRequestInitiated);
    await this._server.on('tls-client-error', logNativeProxyTlsClientError);
    await this._server.on('client-error', logNativeProxyClientError);
    await this._server.on(
      'websocket-request',
      this._logNativeProxyWebSocketRequest,
    );
    await this._server.on(
      'websocket-accepted',
      this._logNativeProxyWebSocketAccepted,
    );
    await this._server.on(
      'websocket-message-received',
      this._logNativeProxyWebSocketMessageReceived,
    );
    await this._server.on(
      'websocket-message-sent',
      this._logNativeProxyWebSocketMessageSent,
    );
    await this._server.on(
      'websocket-close',
      this._logNativeProxyWebSocketClose,
    );

    await this._server
      .forGet('/health-check')
      .thenReply(200, 'Mock server is running');
    await this._server
      .forGet(
        /^http:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2)(:\\d+)?\/favicon\.ico$/,
      )
      .thenReply(200, 'favicon.ico');

    if (this._testSpecificMock) {
      logger.info('Applying testSpecificMock function (takes precedence)');
      await this._testSpecificMock(this._server);
    }

    await this._server.forAnyWebSocket().thenPassThrough();

    await setupAccountsV2SupportedNetworksMock(this._server);
    await setupAccountsV4TransactionsMock(this._server);

    await this._server
      .forAnyRequest()
      .matching((request) => request.path.startsWith('/proxy'))
      .thenCallback(async (request) => {
        // During shutdown, consume the body (to prevent mockttp's streamToBuffer
        // from producing an unhandled rejection) and return 503 immediately.
        if (this._shuttingDown) {
          try {
            await request.body.getText();
          } catch {
            /* swallow abort errors */
          }
          return { statusCode: 503, body: 'Server shutting down' };
        }
        this._activeRequests++;
        try {
          const urlEndpoint = new URL(request.url).searchParams.get('url');
          if (!urlEndpoint) {
            return {
              statusCode: 400,
              body: JSON.stringify({ error: 'Missing url parameter' }),
            };
          }

          const method = request.method.toUpperCase();
          const requestBodyText = methodCanHaveRequestBody(method)
            ? await safeGetBodyText(request)
            : undefined;

          return await handleNormalizedHttpProxyRequest(
            {
              source: 'shim-proxy',
              targetUrl: urlEndpoint,
              method,
              headers: request.headers,
              bodyText: requestBodyText,
            },
            {
              events: this._events,
              liveRequests: this._server?._liveRequests,
              getForwardUrl: getProxyForwardUrl,
            },
          );
        } catch (error) {
          // Client dropped the connection before we could respond (e.g. bridge
          // controller AbortController fired mid-request). Return a benign
          // response so mockttp doesn't surface an unhandled rejection.
          if (error instanceof Error && error.message === 'Aborted') {
            return { statusCode: 499, body: '' };
          }
          throw error;
        } finally {
          this._activeRequests--;
        }
      });

    await this._server.forUnmatchedRequest().thenCallback(async (request) => {
      // During shutdown, consume the body and return 503 immediately.
      if (this._shuttingDown) {
        try {
          await request.body.getText();
        } catch {
          /* swallow abort errors */
        }
        return { statusCode: 503, body: 'Server shutting down' };
      }

      this._activeRequests++;
      try {
        // Check for MockServer self-reference to prevent ECONNREFUSED
        try {
          const url = new URL(request.url);
          const isLocalhost =
            url.hostname === 'localhost' ||
            url.hostname === '127.0.0.1' ||
            url.hostname === '10.0.2.2';
          const isMockServerPort =
            url.port === '8000' || url.port === this._serverPort.toString();

          if (isLocalhost && isMockServerPort) {
            logger.debug(`Ignoring MockServer self-reference: ${request.url}`);
            return { statusCode: 204, body: '' };
          }
        } catch (e) {
          // Ignore URL parsing errors
        }

        const method = request.method.toUpperCase();
        const bodyText = methodCanHaveRequestBody(method)
          ? await safeGetBodyText(request)
          : undefined;
        // If body read was aborted, return 499 (client closed request)
        if (method === 'POST' && bodyText === undefined) {
          return { statusCode: 499, body: '' };
        }

        return await handleNormalizedHttpProxyRequest(
          {
            source: 'device-proxy',
            targetUrl: request.url,
            method,
            headers: request.headers,
            bodyText,
          },
          {
            events: this._events,
            liveRequests: this._server?._liveRequests,
            getForwardUrl: getProxyForwardUrl,
          },
        );
      } catch (error) {
        // Client dropped the connection before we could respond (e.g. bridge
        // controller AbortController fired mid-request). Return a benign
        // response so mockttp doesn't surface an unhandled rejection.
        if (error instanceof Error && error.message === 'Aborted') {
          return { statusCode: 499, body: '' };
        }
        throw error;
      } finally {
        this._activeRequests--;
      }
    });

    this._serverStatus = ServerStatus.STARTED;
    this._installAbortFilter();
  }

  private _logNativeProxyWebSocketRequest = (
    request: CompletedRequest,
  ): void => {
    const redactedUrl = redactNativeProxyUrl(request.url);
    this._webSocketUrlsByStreamId.set(request.id, redactedUrl);

    logger.warn(
      `[E2E_NATIVE_PROXY_WS_REQUEST] ${request.method} ${redactedUrl} protocol=${request.protocol} host=${getRequestHost(request)}`,
    );
  };

  private _logNativeProxyWebSocketAccepted = (
    response: CompletedResponse,
  ): void => {
    logger.warn(
      `[E2E_NATIVE_PROXY_WS_ACCEPTED] streamId=${response.id} status=${response.statusCode} url=${this._getNativeProxyWebSocketUrl(response.id)}`,
    );
  };

  private _logNativeProxyWebSocketMessageReceived = (
    message: WebSocketMessage,
  ): void => {
    this._logNativeProxyWebSocketMessage(
      'E2E_NATIVE_PROXY_WS_MESSAGE_RECEIVED',
      message,
    );
  };

  private _logNativeProxyWebSocketMessageSent = (
    message: WebSocketMessage,
  ): void => {
    this._logNativeProxyWebSocketMessage(
      'E2E_NATIVE_PROXY_WS_MESSAGE_SENT',
      message,
    );
  };

  private _logNativeProxyWebSocketClose = (close: WebSocketClose): void => {
    logger.warn(
      `[E2E_NATIVE_PROXY_WS_CLOSE] streamId=${close.streamId} url=${this._getNativeProxyWebSocketUrl(close.streamId)} closeCode=${
        close.closeCode ?? 'unknown'
      } closeReason=${close.closeReason || 'none'}`,
    );
    this._webSocketUrlsByStreamId.delete(close.streamId);
  };

  private _logNativeProxyWebSocketMessage(
    marker: string,
    message: WebSocketMessage,
  ): void {
    const { summary, methods, isBalanceCandidate } =
      summarizeWebSocketMessage(message);
    const url = this._getNativeProxyWebSocketUrl(message.streamId);

    logger.warn(
      `[${marker}] streamId=${message.streamId} url=${url} ${summary}`,
    );

    if (isBalanceCandidate) {
      logger.warn(
        `[E2E_NATIVE_PROXY_WS_BALANCE_CANDIDATE] streamId=${
          message.streamId
        } url=${url} methods=${Array.from(new Set(methods)).join(',')}`,
      );
    }
  }

  private _getNativeProxyWebSocketUrl(streamId: string): string {
    return this._webSocketUrlsByStreamId.get(streamId) ?? 'unknown';
  }

  /**
   * Puts the server into draining mode — handlers return 503 immediately
   * without forwarding. Call this before stopping backend services (Anvil/Ganache)
   * to prevent forwarding requests to dead backends during cleanup.
   */
  startDraining(): void {
    logger.info(
      'MockServer entering drain mode — new requests will receive 503',
    );
    this._shuttingDown = true;
  }

  /**
   * Removes the lifecycle-wide abort filter. Call this AFTER all cleanup is
   * complete to ensure late async "Aborted" rejections are caught.
   *
   * This method is intentionally async: CI logs show abort events firing up to
   * ~200ms AFTER all cleanup has completed and this method is called. We hold
   * the filter active for an extra 500ms before restoring Jest's handlers so
   * those stragglers are still suppressed rather than recorded as test failures.
   */
  async removeAbortFilter(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    this._removeAbortFilter();
  }

  async stop(): Promise<void> {
    logger.info('Mock server shutting down');
    if (!this._server) {
      this._serverStatus = ServerStatus.STOPPED;
      return;
    }

    // Signal handlers to stop processing new requests. Any request arriving
    // after this flag is set will have its body consumed (preventing mockttp's
    // streamToBuffer from producing an unhandled rejection) and receive 503.
    this._shuttingDown = true;

    // Wait for in-flight request handlers to complete. This is the key to
    // avoiding the "Aborted" unhandled rejections: mockttp's stop() calls
    // destroy() which immediately kills all TCP connections. If a handler is
    // still running (e.g. awaiting handleDirectFetch to a real backend), the
    // IncomingMessage is aborted and streamToBuffer rejects its promise.
    // By waiting for handlers to finish, destroy() only kills idle connections.
    await this._waitForActiveRequests();

    try {
      if (this._server) {
        await this._server.stop();
      }
      // Brief drain period: 'aborted' events from destroyed sockets may fire
      // asynchronously on the next event-loop tick after `stop()` resolves.
      // 500ms is generous for CI environments where event-loop ticks may be delayed.
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      logger.error('Error stopping mock server:', error);
    } finally {
      this._webSocketUrlsByStreamId.clear();
      this._shuttingDown = false;
      this._server = null;
      this._serverStatus = ServerStatus.STOPPED;
      // Release the port after server is stopped
      if (this._serverPort > 0) {
        PortManager.getInstance().releasePort(ResourceType.MOCK_SERVER);
      }
    }
  }

  /**
   * Checks whether an error is a mockttp "Aborted" error from streamToBuffer.
   */
  private static _isMockttpAbortError(error: unknown): boolean {
    return (
      error instanceof Error &&
      error.message === 'Aborted' &&
      (error.stack?.includes('mockttp') ?? false)
    );
  }

  /**
   * Installs lifecycle-wide filters for mockttp "Aborted" errors on BOTH
   * `unhandledRejection` AND `uncaughtException`.
   *
   * When the app unexpectedly drops connections during a test (e.g., UI transitions,
   * RN bridge interruptions), mockttp's internal `streamToBuffer` rejects with
   * `Error('Aborted')` from `buffer-utils.ts`. Depending on the Node.js runtime
   * behaviour and how the error surfaces through mockttp's internals, this can appear
   * as either an unhandled promise rejection OR an uncaught exception (e.g. from a
   * stream 'error' event with no listener, or a throw inside a setImmediate callback).
   *
   * jest-circus installs the same `uncaught` handler on both event types, so we must
   * intercept both to prevent the error from being recorded as a test failure.
   *
   * The filters are active for the entire server lifecycle (start → stop).
   */
  private _installAbortFilter(): void {
    if (this._abortFilterHandler) {
      return; // Already installed
    }

    this._abortSuppressCount = 0;

    // --- unhandledRejection filter ---
    this._originalRejectionHandlers = process
      .rawListeners('unhandledRejection')
      .slice() as ((...args: unknown[]) => void)[];
    process.removeAllListeners('unhandledRejection');

    this._abortFilterHandler = (reason: unknown, promise: unknown) => {
      const rejectedPromise = promise as Promise<unknown>;
      if (MockServerE2E._isMockttpAbortError(reason)) {
        // Mark the promise as handled so Node.js does not consider it unhandled.
        // eslint-disable-next-line no-empty-function
        rejectedPromise.catch(() => {});
        this._abortSuppressCount++;
        logger.debug(
          `Suppressed mockttp Aborted rejection (#${this._abortSuppressCount})`,
        );
        return;
      }

      // Forward any other unhandled rejection to the original handlers (e.g. Jest).
      if (this._originalRejectionHandlers.length === 0) {
        throw reason;
      }
      let firstError: unknown;
      for (const handler of this._originalRejectionHandlers) {
        try {
          handler(reason, rejectedPromise);
        } catch (err) {
          if (firstError === undefined) {
            firstError = err;
          }
        }
      }
      if (firstError !== undefined) {
        throw firstError;
      }
    };

    process.on('unhandledRejection', this._abortFilterHandler);

    // --- uncaughtException filter ---
    this._originalExceptionHandlers = process
      .rawListeners('uncaughtException')
      .slice() as ((...args: unknown[]) => void)[];
    process.removeAllListeners('uncaughtException');

    this._abortExceptionHandler = (error: unknown, origin: unknown) => {
      if (MockServerE2E._isMockttpAbortError(error)) {
        this._abortSuppressCount++;
        logger.debug(
          `Suppressed mockttp Aborted exception (#${this._abortSuppressCount})`,
        );
        return;
      }

      // Forward any other exception to the original handlers (e.g. Jest).
      if (this._originalExceptionHandlers.length === 0) {
        throw error;
      }
      let firstError: unknown;
      for (const handler of this._originalExceptionHandlers) {
        try {
          handler(error, origin);
        } catch (err) {
          if (firstError === undefined) {
            firstError = err;
          }
        }
      }
      if (firstError !== undefined) {
        throw firstError;
      }
    };

    process.on('uncaughtException', this._abortExceptionHandler);

    logger.info(
      `Abort filter installed — listeners: unhandledRejection=${process.listenerCount('unhandledRejection')}, uncaughtException=${process.listenerCount('uncaughtException')}`,
    );
  }

  /**
   * Removes the lifecycle-wide Aborted error filters and restores original handlers.
   * Any handlers added by other code during the filter's lifetime are preserved.
   */
  private _removeAbortFilter(): void {
    if (!this._abortFilterHandler) {
      return;
    }

    // --- Restore unhandledRejection handlers ---
    const currentRejectionHandlers = process
      .rawListeners('unhandledRejection')
      .slice();
    const addedRejectionDuringLifecycle = currentRejectionHandlers.filter(
      (h) =>
        h !== this._abortFilterHandler &&
        !this._originalRejectionHandlers.includes(
          h as (...args: unknown[]) => void,
        ),
    );

    process.removeAllListeners('unhandledRejection');
    for (const handler of [
      ...this._originalRejectionHandlers,
      ...(addedRejectionDuringLifecycle as ((...args: unknown[]) => void)[]),
    ]) {
      process.on('unhandledRejection', handler);
    }

    // --- Restore uncaughtException handlers ---
    if (this._abortExceptionHandler) {
      const currentExceptionHandlers = process
        .rawListeners('uncaughtException')
        .slice();
      const addedExceptionDuringLifecycle = currentExceptionHandlers.filter(
        (h) =>
          h !== this._abortExceptionHandler &&
          !this._originalExceptionHandlers.includes(
            h as (...args: unknown[]) => void,
          ),
      );

      process.removeAllListeners('uncaughtException');
      for (const handler of [
        ...this._originalExceptionHandlers,
        ...(addedExceptionDuringLifecycle as ((...args: unknown[]) => void)[]),
      ]) {
        process.on('uncaughtException', handler);
      }
    }

    this._abortFilterHandler = null;
    this._abortExceptionHandler = null;
    this._originalRejectionHandlers = [];
    this._originalExceptionHandlers = [];

    logger.info(
      `Abort filter removed — suppressed ${this._abortSuppressCount} mockttp "Aborted" error(s) during server lifecycle`,
    );
    this._abortSuppressCount = 0;
  }

  /**
   * Waits for all active request handler callbacks to complete.
   * Polls every 50ms until _activeRequests reaches 0 or the timeout expires.
   *
   * @param timeoutMs - Maximum time to wait (default 5s, generous for slow CI)
   */
  private async _waitForActiveRequests(timeoutMs = 5000): Promise<void> {
    if (this._activeRequests === 0) {
      return;
    }
    logger.info(
      `Waiting for ${this._activeRequests} active request(s) to complete before shutdown...`,
    );
    const start = Date.now();
    while (this._activeRequests > 0 && Date.now() - start < timeoutMs) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    if (this._activeRequests > 0) {
      logger.warn(
        `${this._activeRequests} request(s) still active after ${timeoutMs}ms timeout, proceeding with shutdown`,
      );
    } else {
      logger.info(
        `All requests drained in ${Date.now() - start}ms, proceeding with shutdown`,
      );
    }
  }

  validateLiveRequests(): void {
    const mockServer = this._server;
    if (!mockServer?._liveRequests || mockServer._liveRequests.length === 0) {
      return;
    }

    const uniqueRequests = Array.from(
      new Map(
        mockServer._liveRequests.map((req) => [
          `${req.method} ${req.url}`,
          req,
        ]),
      ).values(),
    );

    const requestsSummary = uniqueRequests
      .map(
        (req, index) =>
          `${index + 1}. [${req.method}] ${req.url} (${req.timestamp})`,
      )
      .join('\n');

    const totalCount = mockServer._liveRequests.length;
    const uniqueCount = uniqueRequests.length;
    const message =
      `Test made ${totalCount} unmocked request(s) (${uniqueCount} unique):\n${requestsSummary}\n\n` +
      "Check your test-specific mocks or add them to the default mocks.\n You can also add the URL to the allowlist if it's a known live request.";
    logger.error(message);
    throw new Error(message);
  }

  private _sanitizeJson(value: unknown, ignoreFields: string[]): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this._sanitizeJson(item, ignoreFields));
    }
    if (value && typeof value === 'object') {
      const obj = value as Record<string, unknown>;
      const result: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(obj)) {
        if (ignoreFields.includes(key)) continue;
        result[key] = this._sanitizeJson(val, ignoreFields);
      }
      return result;
    }
    return value;
  }
}
