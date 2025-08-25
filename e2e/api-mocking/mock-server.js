/* eslint-disable no-console */
/* eslint-disable import/no-nodejs-modules */
import { getLocal } from 'mockttp';
import portfinder from 'portfinder';
import _ from 'lodash';
import { device } from 'detox';
import { ALLOWLISTED_HOSTS, ALLOWLISTED_URLS } from './mock-e2e-allowlist.js';
import { createLogger } from '../framework/logger';

const logger = createLogger({
  name: 'MockServer',
});

/**
 * Utility function to handle direct fetch requests
 * @param {string} url - The URL to fetch from
 * @param {string} method - The HTTP method
 * @param {Headers} headers - Request headers
 * @param {Object} requestBody - The request body object
 * @returns {Promise<{statusCode: number, body: string}>} Response object
 */
const handleDirectFetch = async (url, method, headers, requestBody) => {
  try {
    const response = await global.fetch(url, {
      method,
      headers,
      body: ['POST', 'PUT', 'PATCH'].includes(method) ? requestBody : undefined,
    });

    const responseBody = await response.text();

    return {
      statusCode: response.status,
      body: responseBody,
    };
  } catch (error) {
    logger.error('Error forwarding request:', url);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to forward request' }),
    };
  }
};

/**
 * Utility function to check if a URL is allowed
 * @param {string} url - The URL to check
 * @returns {boolean} True if the URL is allowed, false otherwise
 */
const isUrlAllowed = (url) => {
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
 *
 * @param {Object} events - The events to mock, organised by method.
 * @param {number} [port] - Optional port number. If not provided, a free port will be used.
 * @returns {Promise} Resolves to the running mock server.
 */
export const startMockServer = async (events, port) => {
  const mockServer = getLocal();
  port = port || (await portfinder.getPortPromise());

  // Track live requests
  const liveRequests = [];
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

  // Handle all /proxy requests
  await mockServer
    .forAnyRequest()
    .matching((request) => request.path.startsWith('/proxy'))
    .thenCallback(async (request) => {
      const urlEndpoint = new URL(request.url).searchParams.get('url');
      const method = request.method;
      // Read the body ONCE for POST requests to avoid stream exhaustion
      let requestBodyText;
      let requestBodyJson;
      if (method === 'POST') {
        try {
          requestBodyText = await request.body.getText();
          try {
            requestBodyJson = JSON.parse(requestBodyText);
          } catch (e) {
            requestBodyJson = undefined;
          }
        } catch (e) {
          requestBodyText = undefined;
        }
      }

      // Find matching mock event
      const methodEvents = events[method] || [];
      const candidateEvents = methodEvents.filter((event) => {
        const eventUrl = event.urlEndpoint;
        if (!eventUrl || !urlEndpoint) return false;
        if (event.urlEndpoint instanceof RegExp) {
          return event.urlEndpoint.test(urlEndpoint);
        }
        // Support exact match and prefix (partial) match to avoid leaking keys in tests

        return urlEndpoint === eventUrl || urlEndpoint.startsWith(eventUrl);
      });

      let matchingEvent;

      if (candidateEvents.length > 0) {
        if (method === 'POST') {
          // Prefer events whose requestBody matches (respecting ignoreFields)
          matchingEvent = candidateEvents.find((event) => {
            if (!event.requestBody || !requestBodyJson) return false;
            const requestToCheck = _.cloneDeep(requestBodyJson);
            const expectedRequest = _.cloneDeep(event.requestBody);
            const ignoreFields = event.ignoreFields || [];
            ignoreFields.forEach((field) => {
              _.unset(requestToCheck, field);
              _.unset(expectedRequest, field);
            });
            return _.isMatch(requestToCheck, expectedRequest);
          });

          // Fallback to an event without a requestBody matcher
          if (!matchingEvent) {
            matchingEvent = candidateEvents.find((event) => !event.requestBody);
          }
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
          const parsedRequestBodyJson = requestBodyJson;

          // Ensure both objects exist before comparison
          if (!parsedRequestBodyJson || !matchingEvent.requestBody) {
            console.log('Request body validation failed: Missing request body');
            return {
              statusCode: 400,
              body: JSON.stringify({ error: 'Missing request body' }),
            };
          }

          // Clone objects to avoid mutations
          const requestToCheck = _.cloneDeep(parsedRequestBodyJson);
          const expectedRequest = _.cloneDeep(matchingEvent.requestBody);

          const ignoreFields = matchingEvent.ignoreFields || [];

          // Remove ignored fields from both objects for comparison
          ignoreFields.forEach((field) => {
            _.unset(requestToCheck, field);
            _.unset(expectedRequest, field);
          });

          const matches = _.isMatch(requestToCheck, expectedRequest);

          if (!matches) {
            logger.warn('Request body validation failed:');
            logger.info(
              'Expected:',
              JSON.stringify(matchingEvent.requestBody, null, 2),
            );
            logger.info('Received:', JSON.stringify(requestBodyJson, null, 2));
            logger.info(
              'Differences:',
              JSON.stringify(
                _.differenceWith(
                  [parsedRequestBodyJson],
                  [matchingEvent.requestBody],
                  _.isEqual,
                ),
                null,
                2,
              ),
            );

            return {
              statusCode: 404,
              body: JSON.stringify({
                error: 'Request body validation failed',
                expected: matchingEvent.requestBody,
                received: parsedRequestBodyJson,
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
        console.warn(`Allowed URL: ${updatedUrl}`);
        if (method === 'POST') {
          console.warn(`Request Body: ${requestBodyText}`);
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
 * @param {import('mockttp').Mockttp} mockServer
 * @returns {void}
 */
export const validateLiveRequests = (mockServer) => {
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
    // This is temporary, we will remove this in the future when we expect no unknown live request to happen in a test
    logger.warn(
      `Test made ${totalCount} unmocked request(s) (${uniqueCount} unique):\n${requestsSummary}\n\n` +
        "Check your test-specific mocks or add them to the default mocks.\n You can also add the URL to the allowlist if it's a known live request.",
    );
  }
};

/**
 * Stops the mock server.
 * @param {import('mockttp').Mockttp} mockServer
 */
export const stopMockServer = async (mockServer) => {
  console.log('Mock server shutting down');
  try {
    await mockServer.stop();
  } catch (error) {
    console.error('Error stopping mock server:', error);
  }
};
