/* eslint-disable no-console */
import { getLocal } from 'mockttp';
import portfinder from 'portfinder';
import _ from 'lodash';
import { device } from 'detox';
import { ALLOWLISTED_HOSTS, ALLOWLISTED_URLS } from './mock-e2e-allowlist.js';
import { createLogger } from '../framework/logger';
import { DEFAULT_ANVIL_PORT } from '../seeder/anvil-manager';

const logger = createLogger({
  name: 'MockServer',
});

const BLOCKLISTED_HOSTS = [
  'arbitrum-mainnet.infura.io',
  'bsc-dataseed.binance.org',
  'linea-mainnet.infura.io',
  'linea-sepolia.infura.io',
  'testnet-rpc.monad.xyz',
  'carrot.megaeth.com',
  'mainnet.infura.io',
  'sepolia.infura.io',
  'palm-mainnet.infura.io',
  'base-mainnet.infura.io',
  'bsc-mainnet.infura.io',
  'optimism-mainnet.infura.io',
  'polygon-mainnet.infura.io',
];

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
    logger.error(
      `Error forwarding request: ${url} for method: ${method} for body: ${requestBody}`,
      error,
    );
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to forward request' }),
    };
  }
};

/**
 * Utility function to check if a host is blocklisted and redirect to mock server
 * @param {string} urlEndpoint - The URL endpoint to check
 * @param {number} mockServerPort - The mock server port
 * @returns {string} The original URL or redirected mock server URL
 */
const redirectBlocklistedHost = (urlEndpoint, mockServerPort) => {
  try {
    const urlObj = new URL(urlEndpoint);
    if (BLOCKLISTED_HOSTS.includes(urlObj.host)) {
      const port = DEFAULT_ANVIL_PORT;
      return `http://localhost:${port}`;
    }
    return urlEndpoint;
  } catch (error) {
    logger.error('Error parsing URL for blocklist check:', urlEndpoint);
    return urlEndpoint;
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

  // Initialize global list for live server requests
  if (!global.liveServerRequest) {
    global.liveServerRequest = [];
  }

  await mockServer.start(port);
  logger.debug(`Mockttp server running at http://localhost:${port}`);

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
        // For POST requests, verify the request body if specified
        if (method === 'POST' && matchingEvent.requestBody) {
          const requestBodyJson = await request.body.getJson();

          // Ensure both objects exist before comparison
          if (!requestBodyJson || !matchingEvent.requestBody) {
            logger.debug(
              'Request body validation failed: Missing request body',
            );
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
            logger.debug('Request body validation failed:');
            logger.debug(
              'Expected:',
              JSON.stringify(matchingEvent.requestBody, null, 2),
            );
            logger.debug('Received:', JSON.stringify(requestBodyJson, null, 2));
            logger.debug(
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
      let updatedUrl =
        device.getPlatform() === 'android'
          ? urlEndpoint.replace('localhost', '10.0.2.2')
          : urlEndpoint.replace('localhost', '127.0.0.1');

      // Check if host is blocklisted and redirect to mock server
      updatedUrl = redirectBlocklistedHost(updatedUrl, port);

      // Check if the URL is in the allowed list
      if (!isUrlAllowed(updatedUrl)) {
        const errorMessage = `Request going to live server: ${updatedUrl} for method: ${method}`;
        logger.warn(errorMessage);
        global.liveServerRequest.push(new Error(errorMessage));
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
    // Check if host is blocklisted and redirect to mock server
    const redirectedUrl = redirectBlocklistedHost(request.url, port);

    // Check if the URL is in the allowed list
    if (!isUrlAllowed(redirectedUrl)) {
      const errorMessage = `Request going to live server: ${redirectedUrl} for method: ${request.method}`;
      logger.warn(errorMessage);
      global.liveServerRequest.push(new Error(errorMessage));
    }

    return handleDirectFetch(
      redirectedUrl,
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
  logger.debug('Mock server shutting down');
};
