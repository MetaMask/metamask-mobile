/* eslint-disable no-console */
import { getLocal, Mockttp } from 'mockttp';
import portfinder from 'portfinder';
import _ from 'lodash';
import { isHostAllowed, isUrlAllowed } from './mock-config/request-allowlist';
import { createLogger } from '../framework/logger';
import { MockServerOptions, TestSpecificMock } from '../framework/types';
import { getDefaultResponse } from './mock-config/default-mock-responses';

const logger = createLogger({
  prefix: 'Mock Server',
});

const conditionalLogger =
  process.env.DEBUG_MOCK_SERVER === 'true'
    ? logger
    : // eslint-disable-next-line no-empty-function
      { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} };

/**
 * Utility function to handle direct fetch requests
 */
const handleDirectFetch = async (
  url: string,
  method: string,
  headers: HeadersInit,
  requestBody?: BodyInit | null,
): Promise<{ statusCode: number; body: string }> => {
  logger.debug(`Request going to a live server ===`, url);
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
    conditionalLogger.error('Error forwarding request:', url);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to forward request' }),
    };
  }
};

/**
 * Starts the mock server with enhanced allowlist/blocklist logic.
 */
export const startMockServer = async (
  events: TestSpecificMock,
  options: MockServerOptions = {},
) => {
  const { enableCatchAll = false, port } = options;
  const mockServer = getLocal();
  const resolvedMockPort = port ?? (await portfinder.getPortPromise());

  await mockServer.start(resolvedMockPort);
  logger.debug(
    `Mockttp server running at http://localhost:${resolvedMockPort}`,
  );

  logger.debug(`Catch-all mocking: ${enableCatchAll ? 'ENABLED' : 'DISABLED'}`);

  await mockServer
    .forGet('/health-check')
    .thenReply(200, 'Mock server is running');

  await mockServer
    .forAnyRequest()
    .matching((request) => request.path.startsWith('/proxy'))
    .thenCallback(async (request) => {
      const urlEndpoint = new URL(request.url).searchParams.get('url');

      if (!urlEndpoint) {
        conditionalLogger.error('Missing url parameter in proxy request');
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Missing url parameter' }),
        };
      }

      const method = request.method;
      const targetUrl = new URL(urlEndpoint);
      const { host, pathname } = targetUrl;

      conditionalLogger.debug(
        `Processing ${method} request to: ${urlEndpoint}`,
      );

      if (isHostAllowed(host) || isUrlAllowed(urlEndpoint)) {
        const updatedUrl =
          device.getPlatform() === 'android'
            ? urlEndpoint.replace('localhost', '127.0.0.1')
            : urlEndpoint;

        return handleDirectFetch(
          updatedUrl,
          method,
          request.headers as HeadersInit,
          method === 'POST' ? await request.body.getText() : undefined,
        );
      }

      // TEST-SPECIFIC MOCKING
      const methodEvents = events[method] || [];
      const matchingEvent = methodEvents.find(
        (event) => event.urlEndpoint === urlEndpoint,
      );

      if (matchingEvent) {
        logger.debug(
          `TEST=SPECIFIC MOCK: ${method} request to: ${urlEndpoint}`,
        );
        logger.debug(`Response status: ${matchingEvent.responseCode}`);

        // For POST requests, verify the request body if specified
        if (method === 'POST' && matchingEvent.requestBody) {
          const requestBodyJson = await request.body.getJson();

          // Ensure both objects exist before comparison
          if (!requestBodyJson || !matchingEvent.requestBody) {
            conditionalLogger.error(
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
            conditionalLogger.error('Request body validation failed:');
            conditionalLogger.error(
              'Expected:',
              JSON.stringify(matchingEvent.requestBody, null, 2),
            );
            conditionalLogger.error(
              'Received:',
              JSON.stringify(requestBodyJson, null, 2),
            );
            conditionalLogger.error(
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

      // DEFAULT RESPONSE MOCKING
      const defaultResponse = getDefaultResponse(host, pathname);
      if (defaultResponse) {
        conditionalLogger.debug(
          `📋 DEFAULT MOCK: Using default response for ${host}${pathname}`,
        );
        return {
          statusCode: defaultResponse.statusCode,
          body: JSON.stringify(defaultResponse),
        };
      }

      // CATCH-ALL MOCKING
      if (enableCatchAll) {
        conditionalLogger.warn(
          `No default response found for ${host}${pathname} returning 200 (catch-all)`,
        );
        return {
          statusCode: 200,
          body: JSON.stringify({
            message: 'Catch-all response, no specific mock found',
          }),
        };
      }

      // If catch-all is disabled, fall back to original behavior (pass through)
      const updatedUrl =
        device.getPlatform() === 'android'
          ? urlEndpoint.replace('localhost', '127.0.0.1')
          : urlEndpoint;

      return handleDirectFetch(
        updatedUrl,
        method,
        request.headers as HeadersInit,
        method === 'POST' ? await request.body.getText() : undefined,
      );
    });

  return mockServer;
};

/**
 * Stops the mock server.
 */
export const stopMockServer = async (mockServer: Mockttp) => {
  await mockServer.stop();
  logger.debug('Mock server shutting down');
};
