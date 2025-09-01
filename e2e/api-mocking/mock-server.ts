// eslint-disable-next-line @typescript-eslint/no-shadow
import { getLocal, Headers, Mockttp } from 'mockttp';
import { ALLOWLISTED_HOSTS, ALLOWLISTED_URLS } from './mock-e2e-allowlist';
import { createLogger, LogLevel } from '../framework/logger';
import {
  findMatchingPostEvent,
  processPostRequestBody,
} from './helpers/mockHelpers';
import {
  MockApiEndpoint,
  MockEventsObject,
  TestSpecificMock,
} from '../framework/index';

// Creates a logger with INFO level as the mockServer produces too much noise
// Change this to DEBUG as needed
const logger = createLogger({
  name: 'MockServer',
  level: LogLevel.INFO,
});

interface LiveRequest {
  url: string;
  method: string;
  timestamp: string;
}

interface MockServer extends Mockttp {
  _liveRequests?: LiveRequest[];
}

/**
 * Utility function to handle direct fetch requests
 */
const handleDirectFetch = async (
  url: string,
  method: string,
  headers: Headers,
  requestBody?: string,
): Promise<{ statusCode: number; body: string }> => {
  try {
    // Convert mockttp headers to satisfy fetch API requirements
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

    return {
      statusCode: response.status,
      body: responseBody,
    };
  } catch (error) {
    logger.error('Error forwarding request:', url, error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to forward request' }),
    };
  }
};

/**
 * Utility function to check if a URL is allowed
 */
const isUrlAllowed = (url: string): boolean => {
  try {
    // First check if the exact URL is in the allowed URLs list
    if (ALLOWLISTED_URLS.includes(url)) {
      return true;
    }

    // Then check if the hostname is in the allowed hosts list
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname;

    return ALLOWLISTED_HOSTS.some((allowedHost) => {
      // Support exact match or wildcard subdomains (e.g., "*.example.com")
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

// Using shared port utilities from FixtureUtils

/**
 * Starts the mock server and sets up mock events.
 */
export const startMockServer = async (
  events: MockEventsObject,
  port: number,
  testSpecificMock?: TestSpecificMock,
): Promise<MockServer> => {
  const mockServer = getLocal() as MockServer;

  // Track live requests
  const liveRequests: LiveRequest[] = [];
  mockServer._liveRequests = liveRequests;

  try {
    await mockServer.start(port);
  } catch (error) {
    // If starting fails, log the error and throw it
    logger.error(`Failed to start mock server on port ${port}: ${error}`);
    throw new Error(`Failed to start mock server on port ${port}: ${error}`);
  }

  logger.info(`Mockttp server running at http://localhost:${port}`);

  await mockServer
    .forGet('/health-check')
    .thenReply(200, 'Mock server is running');

  await mockServer
    .forGet(
      /^http:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2)(:\d+)?\/favicon\.ico$/,
    )
    .thenReply(200, 'favicon.ico');

  // Apply test-specific mocks first (takes precedence)
  if (testSpecificMock) {
    logger.info('Applying testSpecificMock function (takes precedence)');
    await testSpecificMock(mockServer);
  }

  // Set up the main proxy handler (fallback logic)
  await mockServer
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
      // Read the body ONCE for POST requests to avoid stream exhaustion
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

      // Find matching mock event
      const methodEvents = events[method] || [];
      const candidateEvents = methodEvents.filter((event: MockApiEndpoint) => {
        const eventUrl = event.urlEndpoint;
        if (!eventUrl) return false;
        if (event.urlEndpoint instanceof RegExp) {
          return event.urlEndpoint.test(urlEndpoint);
        }
        // Support exact match and prefix (partial) match to avoid leaking keys in tests
        const eventUrlStr = String(eventUrl);
        return (
          urlEndpoint === eventUrlStr || urlEndpoint.startsWith(eventUrlStr)
        );
      });

      let matchingEvent: MockApiEndpoint | undefined;

      if (candidateEvents.length > 0) {
        if (method === 'POST') {
          // Use the extracted logic for POST request matching
          matchingEvent =
            findMatchingPostEvent(candidateEvents, requestBodyJson) ||
            undefined;
        } else {
          // Non-POST requests: first candidate by URL
          matchingEvent = candidateEvents[0];
        }
      }

      if (matchingEvent) {
        logger.info(`Mocking ${method} request to: ${urlEndpoint}`);
        logger.info(`Response status: ${matchingEvent.responseCode}`);
        logger.debug('Response:', matchingEvent.response);
        // For POST requests, verify the request body if specified
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

      // If no matching mock found, check if URL is allowed before passing through
      const updatedUrl =
        device.getPlatform() === 'android'
          ? urlEndpoint.replace('localhost', '127.0.0.1')
          : urlEndpoint;

      // Check if the URL is in the allowed list
      if (!isUrlAllowed(updatedUrl)) {
        const errorMessage = `Request going to live server: ${updatedUrl}`;
        logger.warn(errorMessage);
        liveRequests.push({
          url: updatedUrl,
          method,
          timestamp: new Date().toISOString(),
        });
      } else if (ALLOWLISTED_URLS.includes(updatedUrl)) {
        // Explicit debug to help with debugging in CI
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

  // In case any other requests are made, check allowed list before passing through
  await mockServer.forUnmatchedRequest().thenCallback(async (request) => {
    // Check if the URL is in the allowed list
    if (!isUrlAllowed(request.url)) {
      const errorMessage = `Request going to live server: ${request.url}`;
      logger.warn(errorMessage);
      liveRequests.push({
        url: request.url,
        method: request.method,
        timestamp: new Date().toISOString(),
      });
    } else if (ALLOWLISTED_URLS.includes(request.url)) {
      // Explicit debug to help with debugging in CI
      logger.warn(`Allowed URL: ${request.url}`);
      if (request.method === 'POST') {
        logger.warn(`Request Body: ${await request.body.getText()}`);
      }
    }

    return handleDirectFetch(
      request.url,
      request.method,
      request.headers,
      await request.body.getText(),
    );
  });

  return mockServer;
};

/**
 * Validates that no unexpected live requests were made
 */
export const validateLiveRequests = (mockServer: MockServer): void => {
  if (mockServer._liveRequests && mockServer._liveRequests.length > 0) {
    // Get unique requests by method + URL combination
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
};

/**
 * Stops the mock server.
 */
export const stopMockServer = async (mockServer: Mockttp): Promise<void> => {
  logger.info('Mock server shutting down');
  try {
    await mockServer.stop();
  } catch (error) {
    logger.error('Error stopping mock server:', error);
  }
};
