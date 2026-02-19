// eslint-disable-next-line @typescript-eslint/no-shadow
import { getLocal, Headers, Mockttp } from 'mockttp';
import { ALLOWLISTED_HOSTS, ALLOWLISTED_URLS } from './mock-e2e-allowlist.ts';
import { SUPPRESSED_LOGS_URLS } from './mock-config/suppressed-logs.ts';
import { createLogger, LogLevel } from '../framework/logger.ts';
import {
  MockApiEndpoint,
  MockEventsObject,
  Resource,
  ServerStatus,
  TestSpecificMock,
} from '../framework';
import {
  findMatchingPostEvent,
  processPostRequestBody,
  setupAccountsV2SupportedNetworksMock,
} from './helpers/mockHelpers.ts';
import { getLocalHost } from '../framework/fixtures/FixtureUtils.ts';
import PortManager, { ResourceType } from '../framework/PortManager.ts';
import {
  FALLBACK_GANACHE_PORT,
  FALLBACK_DAPP_SERVER_PORT,
} from '../framework/Constants.ts';
import { DEFAULT_ANVIL_PORT } from '../seeder/anvil-manager.ts';

const logger = createLogger({
  name: 'MockServer',
  level: LogLevel.INFO,
});
interface LiveRequest {
  url: string;
  method: string;
  timestamp: string;
}

interface SnapProxyRequest extends LiveRequest {
  mode: 'mocked' | 'passthrough';
}

const SNAP_WEBVIEW_PROXY_SOURCE = 'snap-webview';

const logSnapProxyToConsole = (message: string) => {
  // We intentionally use console.log here so these lines are always visible
  // in Detox/E2E terminal output regardless of logger configuration.
  // eslint-disable-next-line no-console
  console.log(`[SNAP_PROXY] ${message}`);
};

const isSnapDependencyUrl = (url: string): boolean => {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return (
      hostname.endsWith('.infura.io') &&
      (hostname.startsWith('solana-') ||
        hostname.startsWith('bitcoin-') ||
        hostname.startsWith('tron-'))
    );
  } catch {
    return false;
  }
};

const maybeLogSnapInfuraProxyRequest = (
  method: string,
  url: string,
  source: 'mocked' | 'passthrough',
  shouldLog: boolean,
) => {
  if (shouldLog) {
    logSnapProxyToConsole(`[${source}] ${method} ${url}`);
  }
};

export interface InternalMockServer extends Mockttp {
  _liveRequests?: LiveRequest[];
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

const handleDirectFetch = async (
  url: string,
  method: string,
  headers: Headers,
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

export default class MockServerE2E implements Resource {
  _serverPort: number;
  _serverStatus: ServerStatus = ServerStatus.STOPPED;
  private _server: InternalMockServer | null = null;
  private _events: MockEventsObject;
  private _testSpecificMock?: TestSpecificMock;
  private _activeRequests = 0;
  private _shuttingDown = false;
  private _snapProxyRequests: SnapProxyRequest[] = [];

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

    this._server = getLocal() as InternalMockServer;
    this._server._liveRequests = [];
    this._snapProxyRequests = [];
    await this._server.start(this._serverPort);

    logger.info(
      `Mockttp server running at http://${getLocalHost()}:${this._serverPort}`,
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

    await setupAccountsV2SupportedNetworksMock(this._server);

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
          const requestUrl = new URL(request.url);
          const urlEndpoint = requestUrl.searchParams.get('url');
          if (!urlEndpoint) {
            return {
              statusCode: 400,
              body: JSON.stringify({ error: 'Missing url parameter' }),
            };
          }
          const isSnapWebViewProxyRequest =
            requestUrl.searchParams.get('source') === SNAP_WEBVIEW_PROXY_SOURCE;
          const isSnapDependencyRequest = isSnapDependencyUrl(urlEndpoint);
          const shouldTrackSnapRequest =
            isSnapWebViewProxyRequest || isSnapDependencyRequest;

          const method = request.method;

          let requestBodyText: string | undefined;
          let requestBodyJson: unknown;
          if (method === 'POST') {
            try {
              requestBodyText = await request.body.getText();
              if (requestBodyText) {
                try {
                  requestBodyJson = JSON.parse(requestBodyText);
                } catch (e) {
                  requestBodyJson = undefined;
                }
              }
            } catch (e) {
              requestBodyText = undefined;
            }
          }

          const methodEvents = this._events[method] || [];
          const candidateEvents = methodEvents.filter(
            (event: MockApiEndpoint) => {
              const eventUrl = event.urlEndpoint;
              if (!eventUrl) return false;
              if (event.urlEndpoint instanceof RegExp) {
                return event.urlEndpoint.test(urlEndpoint);
              }
              const eventUrlStr = String(eventUrl);
              return (
                urlEndpoint === eventUrlStr ||
                urlEndpoint.startsWith(eventUrlStr)
              );
            },
          );

          let matchingEvent: MockApiEndpoint | undefined;
          if (candidateEvents.length > 0) {
            if (method === 'POST') {
              matchingEvent = findMatchingPostEvent(
                candidateEvents,
                requestBodyJson,
              );
            } else {
              matchingEvent = candidateEvents[0];
            }
          }

          if (matchingEvent) {
            if (shouldTrackSnapRequest) {
              this._recordSnapProxyRequest(method, urlEndpoint, 'mocked');
            }
            maybeLogSnapInfuraProxyRequest(
              method,
              urlEndpoint,
              'mocked',
              shouldTrackSnapRequest,
            );
            logger.debug(`Mocking ${method} request to: ${urlEndpoint}`);
            logger.debug(`Response status: ${matchingEvent.responseCode}`);
            logger.debug('Response:', matchingEvent.response);
            if (method === 'POST' && matchingEvent.requestBody) {
              const result = processPostRequestBody(
                requestBodyText,
                matchingEvent.requestBody,
                { ignoreFields: matchingEvent.ignoreFields || [] },
              );

              if (!result.matches) {
                return {
                  statusCode:
                    result.error === 'Missing request body' ? 400 : 404,
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
              body: JSON.stringify(matchingEvent.response),
            };
          }

          let updatedUrl =
            device.getPlatform() === 'android'
              ? urlEndpoint.replace('localhost', '127.0.0.1')
              : urlEndpoint;

          // Translate fallback ports to actual allocated ports (host-side forwarding)
          updatedUrl = translateFallbackPortToActual(updatedUrl);
          const isSnapDependencyForwardedRequest = isSnapDependencyUrl(updatedUrl);
          const shouldTrackForwardedSnapRequest =
            isSnapWebViewProxyRequest || isSnapDependencyForwardedRequest;
          if (shouldTrackForwardedSnapRequest) {
            this._recordSnapProxyRequest(method, updatedUrl, 'passthrough');
          }
          maybeLogSnapInfuraProxyRequest(
            method,
            updatedUrl,
            'passthrough',
            shouldTrackForwardedSnapRequest,
          );

          if (!isUrlAllowed(updatedUrl)) {
            const errorMessage = `Request going to live server: ${updatedUrl}`;
            logger.warn(errorMessage);
            if (method === 'POST') {
              logger.warn(`Request Body: ${requestBodyText}`);
            }
            this._server?._liveRequests?.push({
              url: updatedUrl,
              method,
              timestamp: new Date().toISOString(),
            });
          } else if (ALLOWLISTED_URLS.includes(updatedUrl)) {
            logger.warn(`Allowed URL: ${updatedUrl}`);
            if (method === 'POST') {
              logger.warn(`Request Body: ${requestBodyText}`);
            }
          }

          return handleDirectFetch(
            updatedUrl,
            method,
            request.headers,
            method === 'POST' ? requestBodyText : undefined,
          );
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

        // Translate fallback ports to actual allocated ports (host-side forwarding)
        const translatedUrl = translateFallbackPortToActual(request.url);
        const shouldTrackSnapRequest = isSnapDependencyUrl(translatedUrl);
        if (shouldTrackSnapRequest) {
          this._recordSnapProxyRequest(
            request.method,
            translatedUrl,
            'passthrough',
          );
        }
        maybeLogSnapInfuraProxyRequest(
          request.method,
          translatedUrl,
          'passthrough',
          shouldTrackSnapRequest,
        );
        if (!isUrlAllowed(translatedUrl)) {
          const errorMessage = `Request going to live server: ${translatedUrl}`;
          logger.warn(errorMessage);
          if (request.method === 'POST') {
            logger.warn(`Request Body: ${await request.body.getText()}`);
          }
          this._server?._liveRequests?.push({
            url: translatedUrl,
            method: request.method,
            timestamp: new Date().toISOString(),
          });
        } else if (ALLOWLISTED_URLS.includes(translatedUrl)) {
          logger.warn(`Allowed URL: ${translatedUrl}`);
          if (request.method === 'POST') {
            logger.warn(`Request Body: ${await request.body.getText()}`);
          }
        }

        return handleDirectFetch(
          translatedUrl,
          request.method,
          request.headers,
          await request.body.getText(),
        );
      } finally {
        this._activeRequests--;
      }
    });

    this._serverStatus = ServerStatus.STARTED;
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
      await this._stopServerSuppressingAbortErrors();
    } catch (error) {
      logger.error('Error stopping mock server:', error);
    } finally {
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
   * Stops the mockttp server while suppressing "Aborted" unhandled promise rejections.
   *
   * When mockttp's `server.stop()` is called, its underlying `destroyable-server` immediately
   * destroys all TCP connections via `socket.destroy()`. Any `IncomingMessage` whose body was
   * being streamed through mockttp's `streamToBuffer` (buffer-utils.ts) will emit 'aborted',
   * causing the buffer promise to reject with `Error('Aborted')`.
   *
   * There is a race window where requests have entered mockttp's internal pipeline
   * (CallbackHandler.handle → waitForCompletedRequest → streamToBuffer) but have not yet
   * reached our callback (so `_activeRequests` hasn't been incremented). For these requests,
   * `_waitForActiveRequests()` sees zero active requests and proceeds with `stop()`, but the
   * body buffering is still in progress. When the socket is destroyed, the buffer promise
   * rejects and Jest catches it as an unhandled rejection, failing the test suite.
   *
   * This method temporarily replaces the process `unhandledRejection` handlers with a filter
   * that suppresses "Aborted" errors originating from mockttp's buffer-utils (verified via
   * stack trace), forwarding all other rejections to the original handlers.
   * After the server is stopped and a brief drain period elapses, the original handlers are
   * restored along with any handlers that were added by other code during the shutdown window.
   */
  private async _stopServerSuppressingAbortErrors(): Promise<void> {
    // Snapshot current handlers so we can restore them after shutdown.
    const originalHandlers = process.rawListeners('unhandledRejection').slice();
    process.removeAllListeners('unhandledRejection');

    let suppressCount = 0;
    const filterHandler = (reason: unknown, promise: Promise<unknown>) => {
      if (
        reason instanceof Error &&
        reason.message === 'Aborted' &&
        reason.stack?.includes('mockttp')
      ) {
        // Mark the promise as handled so Node.js does not consider it unhandled.
        // eslint-disable-next-line no-empty-function
        promise.catch(() => {});
        suppressCount++;
        return;
      }
      // Forward any other unhandled rejection to the original handlers (e.g. Jest).
      if (originalHandlers.length === 0) {
        // No original handlers were registered. Since our filterHandler is a
        // registered listener, Node considers the rejection "handled" and skips
        // its default behaviour (warning + exit). Re-throw so the rejection
        // surfaces as an uncaught exception instead of being silently dropped.
        throw reason;
      }
      let firstError: unknown;
      for (const handler of originalHandlers) {
        try {
          (handler as (...args: unknown[]) => void)(reason, promise);
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
    process.on('unhandledRejection', filterHandler);

    try {
      if (this._server) {
        await this._server.stop();
      }
      // Brief drain period: 'aborted' events from destroyed sockets may fire
      // asynchronously on the next event-loop tick after `stop()` resolves.
      await new Promise((resolve) => setTimeout(resolve, 150));
    } finally {
      // Preserve any handlers that were added by other code during the
      // shutdown window so they are not permanently lost.
      const currentHandlers = process
        .rawListeners('unhandledRejection')
        .slice();
      const addedDuringShutdown = currentHandlers.filter(
        (h) => h !== filterHandler && !originalHandlers.includes(h),
      );

      // Remove all and restore: originals first, then any newly added handlers.
      process.removeAllListeners('unhandledRejection');
      for (const handler of [...originalHandlers, ...addedDuringShutdown]) {
        process.on(
          'unhandledRejection',
          handler as (...args: unknown[]) => void,
        );
      }

      if (suppressCount > 0) {
        logger.info(
          `Suppressed ${suppressCount} "Aborted" rejection(s) during mock server shutdown`,
        );
      }
    }
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

  logSnapProxyRequests(): void {
    if (this._snapProxyRequests.length === 0) {
      return;
    }

    const groupedRequests = new Map<
      string,
      {
        method: string;
        url: string;
        mode: 'mocked' | 'passthrough';
        count: number;
        lastTimestamp: string;
      }
    >();

    for (const request of this._snapProxyRequests) {
      const key = `${request.mode}|${request.method}|${request.url}`;
      const existing = groupedRequests.get(key);
      if (existing) {
        existing.count++;
        existing.lastTimestamp = request.timestamp;
      } else {
        groupedRequests.set(key, {
          method: request.method,
          url: request.url,
          mode: request.mode,
          count: 1,
          lastTimestamp: request.timestamp,
        });
      }
    }

    const summary = Array.from(groupedRequests.values())
      .map(
        (request, index) =>
          `${index + 1}. [${request.mode}] [${request.method}] ${request.url} (count: ${request.count}, last: ${request.lastTimestamp})`,
      )
      .join('\n');

    logSnapProxyToConsole(
      `Snap WebView proxied requests: ${this._snapProxyRequests.length} total (${groupedRequests.size} unique)\n${summary}`,
    );
  }

  private _recordSnapProxyRequest(
    method: string,
    url: string,
    mode: 'mocked' | 'passthrough',
  ): void {
    this._snapProxyRequests.push({
      method,
      url,
      mode,
      timestamp: new Date().toISOString(),
    });
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
