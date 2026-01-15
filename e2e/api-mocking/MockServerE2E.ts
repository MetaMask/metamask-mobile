// eslint-disable-next-line @typescript-eslint/no-shadow
import { getLocal, Headers, Mockttp } from 'mockttp';
import { ALLOWLISTED_HOSTS, ALLOWLISTED_URLS } from './mock-e2e-allowlist';
import { SUPPRESSED_LOGS_URLS } from './mock-config/suppressed-logs';
import { createLogger, LogLevel } from '../framework/logger';
import {
  MockApiEndpoint,
  MockEventsObject,
  Resource,
  ServerStatus,
  TestSpecificMock,
} from '../framework/index';
import {
  findMatchingPostEvent,
  processPostRequestBody,
} from './helpers/mockHelpers';
import { getLocalHost } from '../framework/fixtures/FixtureUtils';
import PortManager, { ResourceType } from '../framework/PortManager';
import {
  FALLBACK_GANACHE_PORT,
  FALLBACK_DAPP_SERVER_PORT,
} from '../framework/Constants';
import { DEFAULT_ANVIL_PORT } from '../seeder/anvil-manager';

const logger = createLogger({
  name: 'MockServer',
  level: LogLevel.INFO,
});
interface LiveRequest {
  url: string;
  method: string;
  timestamp: string;
}

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

    await this._server
      .forAnyRequest()
      .matching((request) => request.path.startsWith('/proxy'))
      .thenCallback(async (request) => {
        const urlEndpoint = new URL(request.url).searchParams.get('url');
        if (!urlEndpoint) {
          return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Missing url parameter' }),
          };
        }

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
              urlEndpoint === eventUrlStr || urlEndpoint.startsWith(eventUrlStr)
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
            body: JSON.stringify(matchingEvent.response),
          };
        }

        let updatedUrl =
          device.getPlatform() === 'android'
            ? urlEndpoint.replace('localhost', '127.0.0.1')
            : urlEndpoint;

        // Translate fallback ports to actual allocated ports (host-side forwarding)
        updatedUrl = translateFallbackPortToActual(updatedUrl);

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
      });

    await this._server.forUnmatchedRequest().thenCallback(async (request) => {
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
    });

    this._serverStatus = ServerStatus.STARTED;
  }

  async stop(): Promise<void> {
    logger.info('Mock server shutting down');
    if (!this._server) {
      this._serverStatus = ServerStatus.STOPPED;
      return;
    }

    try {
      await this._server.stop();
    } catch (error) {
      logger.error('Error stopping mock server:', error);
    } finally {
      this._server = null;
      this._serverStatus = ServerStatus.STOPPED;
      // Release the port after server is stopped
      if (this._serverPort > 0) {
        PortManager.getInstance().releasePort(ResourceType.MOCK_SERVER);
      }
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
