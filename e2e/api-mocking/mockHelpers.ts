import { Mockttp } from 'mockttp';
import _ from 'lodash';
import { createLogger, MockApiEndpoint } from '../framework';
import { getDecodedProxiedURL } from '../specs/notifications/utils/helpers';

const logger = createLogger({
  name: 'TestSpecificMockHelpers',
});

interface ResponseParam {
  requestMethod: 'GET' | 'POST' | 'PUT' | 'DELETE';
  url: string | RegExp;
  response: unknown;
  responseCode: number;
}

export interface PostRequestMatchingOptions {
  ignoreFields?: string[];
  allowPartialMatch?: boolean;
}

export interface PostRequestMatchResult {
  matches: boolean;
  error?: string;
  requestBodyJson?: MockApiEndpoint['requestBody'];
}

/**
 * Processes and validates POST request body against expected request body
 * This is the unified logic extracted from mock-server.js
 *
 * @param requestBodyText - Raw request body text
 * @param expectedRequestBody - Expected request body object to match against
 * @param options - Options for matching behavior
 * @returns Match result with validation status
 */
export const processPostRequestBody = (
  requestBodyText: string | undefined,
  expectedRequestBody: MockApiEndpoint['requestBody'],
  options: PostRequestMatchingOptions = {},
): PostRequestMatchResult => {
  const { ignoreFields = [], allowPartialMatch = true } = options;

  // Handle missing request body
  if (!requestBodyText) {
    return {
      matches: false,
      error: 'Missing request body',
    };
  }

  let requestBodyJson: MockApiEndpoint['requestBody'] | undefined;
  try {
    requestBodyJson = JSON.parse(requestBodyText);
  } catch (e) {
    return {
      matches: false,
      error: 'Invalid request body JSON',
    };
  }

  // If no expected body specified, consider it a match
  if (!expectedRequestBody) {
    return {
      matches: true,
      requestBodyJson,
    };
  }

  // Clone objects to avoid mutations (using lodash for consistency with mock-server.js)
  const requestToCheck = _.cloneDeep(requestBodyJson);
  const expectedRequest = _.cloneDeep(expectedRequestBody);

  // Remove ignored fields from both objects for comparison
  ignoreFields.forEach((field) => {
    _.unset(requestToCheck, field);
    _.unset(expectedRequest, field);
  });

  const matches = allowPartialMatch
    ? typeof requestToCheck === 'object' &&
      requestToCheck !== null &&
      typeof expectedRequest === 'object' &&
      expectedRequest !== null
      ? _.isMatch(requestToCheck, expectedRequest)
      : false
    : _.isEqual(requestToCheck, expectedRequest);

  if (!matches) {
    logger.warn('Request body validation failed:');
    logger.info('Expected:', JSON.stringify(expectedRequestBody, null, 2));
    logger.info('Received:', JSON.stringify(requestBodyJson, null, 2));
    logger.info(
      'Differences:',
      JSON.stringify(
        _.differenceWith([requestBodyJson], [expectedRequestBody], _.isEqual),
        null,
        2,
      ),
    );

    return {
      matches: false,
      error: 'Request body validation failed',
      requestBodyJson,
    };
  }

  return {
    matches: true,
    requestBodyJson,
  };
};

/**
 * Finds a matching event from candidate events based on POST request body
 * This implements the same logic as mock-server.js for finding the best match
 *
 * @param candidateEvents - Array of potential matching events
 * @param requestBodyJson - Parsed request body JSON
 * @returns The best matching event or undefined
 */
export const findMatchingPostEvent = (
  candidateEvents: MockApiEndpoint[],
  requestBodyJson: MockApiEndpoint['requestBody'],
): MockApiEndpoint | undefined => {
  if (!candidateEvents.length) {
    return undefined;
  }

  // Prefer events whose requestBody matches (respecting ignoreFields)
  const matchingEvent = candidateEvents.find((event) => {
    if (!event.requestBody || !requestBodyJson) return false;

    const result = processPostRequestBody(
      JSON.stringify(requestBodyJson),
      event.requestBody,
      { ignoreFields: event.ignoreFields || [] },
    );

    return result.matches;
  });

  // Fallback to an event without a requestBody matcher
  if (!matchingEvent) {
    return candidateEvents.find((event) => !event.requestBody);
  }

  return matchingEvent;
};

async function mockAPICall(server: Mockttp, response: ResponseParam) {
  let requestRuleBuilder;

  if (response.requestMethod === 'GET') {
    requestRuleBuilder = server.forGet('/proxy');
  }

  if (response.requestMethod === 'POST') {
    requestRuleBuilder = server.forPost('/proxy');
  }

  if (response.requestMethod === 'PUT') {
    requestRuleBuilder = server.forPut('/proxy');
  }

  if (response.requestMethod === 'DELETE') {
    requestRuleBuilder = server.forDelete('/proxy');
  }

  await requestRuleBuilder
    ?.matching((request) => {
      const url = getDecodedProxiedURL(request.url);

      if (response.url instanceof RegExp) {
        const matches = response.url.test(url);
        return matches;
      }
      const matches = url.includes(String(response.url));
      return matches;
    })
    .asPriority(999)
    .thenCallback((request) => {
      logger.info(
        `Mocking ${request.method} request to: ${getDecodedProxiedURL(
          request.url,
        )}`,
      );
      logger.debug(`Returning response:`, response.response);
      return {
        statusCode: 200,
        json: response.response,
      };
    });
}

/**
 * Helper to mock a GET request through the mobile proxy pattern with startMockServer processing
 * @param mockServer - The mock server instance
 * @param url - The actual URL to match (not /proxy URL) - supports string or RegExp
 * @param response - The response to return
 * @param statusCode - HTTP status code (default: 200)
 */
export const mockProxyGet = async (
  mockServer: Mockttp,
  url: string | RegExp,
  response: unknown,
  statusCode: number = 200,
) => {
  await mockAPICall(mockServer, {
    requestMethod: 'GET',
    url,
    response,
    responseCode: statusCode,
  });
};

/**
 * Helper to mock a POST request with complex body matching through the mobile proxy pattern
 * @param mockServer - The mock server instance
 * @param url - The actual URL to match (not /proxy URL) - supports string or RegExp
 * @param requestBody - Expected request body object to match against
 * @param response - The response to return
 * @param options - Additional options for matching and response
 */
export const mockProxyPost = async (
  mockServer: Mockttp,
  url: string | RegExp,
  requestBody: unknown,
  response: unknown,
  options: {
    statusCode?: number;
    ignoreFields?: string[];
  } = {},
) => {
  const { statusCode = 200, ignoreFields = [] } = options;

  await mockServer
    .forPost('/proxy')
    .matching((request) => {
      const decodedUrl = getDecodedProxiedURL(request.url);

      if (url instanceof RegExp) {
        const matches = url.test(decodedUrl);
        return matches;
      }
      const matches = decodedUrl.includes(String(url));
      return matches;
    })
    .asPriority(999)
    .thenCallback(async (request) => {
      const decodedUrl = getDecodedProxiedURL(request.url);

      try {
        const requestBodyText = await request.body.getText();

        const result = processPostRequestBody(requestBodyText, requestBody, {
          ignoreFields,
        });

        if (!result.matches) {
          logger.warn('❌ Request body validation failed for', decodedUrl);
          logger.debug('Expected:', requestBody);
          logger.debug('Received:', result.requestBodyJson);
          logger.debug('Ignored fields:', ignoreFields);
          logger.debug('Error:', result.error);
          return {
            statusCode:
              result.error === 'Missing request body' ||
              result.error === 'Invalid request body JSON'
                ? 400
                : statusCode,
            json: response,
          };
        }

        logger.info(`Mocking POST request to: ${decodedUrl}`);
        logger.debug(`Returning response:`, response);

        return {
          statusCode,
          json: response,
        };
      } catch (error) {
        logger.error('Error processing request:', error);
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Error processing request' }),
        };
      }
    });
};

/**
 * Convenience helper to mock simulation requests like SEND_ETH_SIMULATION_MOCK
 * @param mockServer - The mock server instance
 * @param simulationMock - Object with urlEndpoint, requestBody, ignoreFields, response, and responseCode
 */
export const mockSimulation = async (
  mockServer: Mockttp,
  simulationMock: {
    urlEndpoint: string | RegExp;
    requestBody: unknown;
    ignoreFields?: string[];
    response: unknown;
    responseCode?: number;
  },
) => {
  await mockProxyPost(
    mockServer,
    simulationMock.urlEndpoint,
    simulationMock.requestBody,
    simulationMock.response,
    {
      statusCode: simulationMock.responseCode || 200,
      ignoreFields: simulationMock.ignoreFields || [],
    },
  );
};

/**
 * Helper to intercept and transform URLs through the mobile proxy pattern
 * @param mockServer - The mock server instance
 * @param urlMatcher - Function to match URLs that need transformation
 * @param urlTransformer - Function to transform the URL
 */
export const interceptProxyUrl = async (
  mockServer: Mockttp,
  urlMatcher: (url: string) => boolean,
  urlTransformer: (url: string) => string,
) => {
  await mockServer
    .forAnyRequest()
    .matching((req) => {
      if (!req.path.startsWith('/proxy')) return false;
      const urlParam = new URL(req.url).searchParams.get('url');
      return urlParam ? urlMatcher(urlParam) : false;
    })
    .thenCallback(async (request) => {
      const urlParam = new URL(request.url).searchParams.get('url');
      if (!urlParam) {
        return { statusCode: 400, body: 'Missing url parameter' };
      }

      const transformedUrl = urlTransformer(urlParam);

      const headers: Record<string, string> = {};
      for (const [key, value] of Object.entries(request.headers)) {
        if (typeof value === 'string') {
          headers[key] = value;
        }
      }

      const response = await fetch(transformedUrl, {
        method: request.method,
        headers,
        body:
          request.method === 'POST' ? await request.body.getText() : undefined,
      });

      return {
        statusCode: response.status,
        body: await response.text(),
      };
    });
};
