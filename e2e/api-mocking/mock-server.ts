// eslint-disable-next-line @typescript-eslint/no-shadow
import { getLocal, Headers, Mockttp } from 'mockttp';
import { ALLOWLISTED_HOSTS, ALLOWLISTED_URLS } from './mock-e2e-allowlist';
import { BLOCKLISTED_HOSTS } from './mock-e2e-blocklist.js';
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
 * Utility function to check if a host is blocklisted
 * @param {string} host - The host to check
 * @returns {boolean} True if the host is blocklisted, false otherwise
 */
const isHostBlocklisted = (host: string) => BLOCKLISTED_HOSTS.includes(host);

/**
 * Apply Android URL replacement if needed
 * @param {string} url - The URL to potentially modify
 * @returns {string} The URL with localhost replaced by 127.0.0.1 on Android
 */
const applyAndroidUrlReplacement = (url: string) =>
  device.getPlatform() === 'android'
    ? url.replace('localhost', '127.0.0.1')
    : url;

/**
 * Check if URL or hostname is allowlisted
 * @param {string} url - The URL to check
 * @returns {boolean} True if URL or hostname is allowlisted
 */
const isAllowlisted = (url: string) => {
  // Check exact URL match first
  if (ALLOWLISTED_URLS.includes(url)) {
    return true;
  }
  // Then check if the hostname is in the allowed hosts list
  const parsedUrl = new URL(url);
  const hostname = parsedUrl.hostname;
  // Allow data URLs, e.g. for decoding base64
  if (parsedUrl.protocol === 'data:') {
    return true;
  }

  // Check exact hostname match
  return ALLOWLISTED_HOSTS.includes(hostname);
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
        logger.info(
          `Mocking ${method} request to: ${urlEndpoint} with request body: ${requestBodyJson}`,
        );
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

      // If no matching mock found, apply blocklist/allowlist logic

      // Step 1: Check if host is blocklisted - redirect to local blockchain node
      try {
        const parsedUrl = new URL(urlEndpoint);
        if (isHostBlocklisted(parsedUrl.hostname)) {
          const blocklistRedirectUrl = applyAndroidUrlReplacement(
            'http://localhost:8545',
          );
          logger.debug(
            `Redirecting blocklisted host ${parsedUrl.toString()} to ${blocklistRedirectUrl} with method ${method} and request body ${requestBodyText}`,
          );
          return handleDirectFetch(
            blocklistRedirectUrl,
            method,
            request.headers,
            method === 'POST' ? requestBodyText : undefined,
          );
        }
      } catch (error) {
        logger.warn('Invalid URL in proxy:', urlEndpoint);
      }

      // Step 2: Check if URL or host is allowlisted - pass through to live server
      if (isAllowlisted(urlEndpoint)) {
        logger.warn('Request going to allowlisted live server:', urlEndpoint);

        return handleDirectFetch(
          applyAndroidUrlReplacement(urlEndpoint),
          method,
          request.headers,
          method === 'POST' ? requestBodyText : undefined,
        );
      }
    });

  // Handle any unmatched requests (typically internal/direct requests)
  await mockServer.forUnmatchedRequest().thenCallback(async (request) => {
    logger.debug(`Unmatched request: ${request.method} ${request.url}`);

    liveRequests.push({
      url: request.url,
      method: request.method,
      timestamp: new Date().toISOString(),
    });

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
