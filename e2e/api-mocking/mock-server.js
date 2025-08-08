/* eslint-disable no-console */
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
    console.error('Error forwarding request:', url);
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

  await mockServer.start(port);
  console.log(`Mockttp server running at http://localhost:${port}`);

  await mockServer
    .forGet('/health-check')
    .thenReply(200, 'Mock server is running');

  // Handle all /proxy requests
  await mockServer
    .forAnyRequest()
    .matching((request) => request.path.startsWith('/proxy'))
    .thenCallback(async (request) => {
      const urlEndpoint = new URL(request.url).searchParams.get('url');
      const method = request.method;

      // Find matching mock event
      const methodEvents = events[method] || [];
      const matchingEvent = methodEvents.find(
        (event) => event.urlEndpoint === urlEndpoint,
      );

      if (matchingEvent) {
        console.log(`Mocking ${method} request to: ${urlEndpoint}`);
        console.log(`Response status: ${matchingEvent.responseCode}`);
        console.log('Response:', matchingEvent.response);

        // For POST requests, verify the request body if specified
        if (method === 'POST' && matchingEvent.requestBody) {
          const requestBodyJson = await request.body.getJson();

          // Ensure both objects exist before comparison
          if (!requestBodyJson || !matchingEvent.requestBody) {
            console.log('Request body validation failed: Missing request body');
            return {
              statusCode: 400,
              body: JSON.stringify({ error: 'Missing request body' }),
            };
          }

          // Clone objects to avoid mutations
          const requestToCheck = _.cloneDeep(requestBodyJson);
          const expectedRequest = _.cloneDeep(matchingEvent.requestBody);

          const ignoreFields = matchingEvent.ignoreFields || [];

          // Remove ignored fields from both objects for comparison
          ignoreFields.forEach((field) => {
            _.unset(requestToCheck, field);
            _.unset(expectedRequest, field);
          });

          const matches = _.isMatch(requestToCheck, expectedRequest);

          if (!matches) {
            console.log('Request body validation failed:');
            console.log(
              'Expected:',
              JSON.stringify(matchingEvent.requestBody, null, 2),
            );
            console.log('Received:', JSON.stringify(requestBodyJson, null, 2));
            console.log(
              'Differences:',
              JSON.stringify(
                _.differenceWith(
                  [requestBodyJson],
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
                received: requestBodyJson,
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
        global.liveServerRequest = new Error(errorMessage);
      }

      return handleDirectFetch(
        updatedUrl,
        method,
        request.headers,
        method === 'POST' ? await request.body.getText() : undefined,
      );
    });

  // In case any other requests are made, check allowed list before passing through
  await mockServer.forUnmatchedRequest().thenCallback(async (request) => {
    // Check if the URL is in the allowed list
    if (!isUrlAllowed(request.url)) {
      const errorMessage = `Request going to live server: ${request.url}`;
      logger.warn(errorMessage);
      global.liveServerRequest = new Error(errorMessage);
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
 * Stops the mock server.
 * @param {import('mockttp').Mockttp} mockServer
 */
export const stopMockServer = async (mockServer) => {
  await mockServer.stop();
  console.log('Mock server shutting down');
};
