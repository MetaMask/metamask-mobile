/* eslint-disable @typescript-eslint/no-explicit-any */
import { Mockttp } from 'mockttp';
import { createLogger } from '../framework';
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
        logger.info(`🔍 RegExp match for ${url}: ${matches}`);
        return matches;
      }
      const matches = decodedUrl.includes(String(url));
      logger.info(
        `🔍 String match for "${String(url)}": ${matches} (in "${decodedUrl}")`,
      );
      return matches;
    })
    .asPriority(999)
    .thenCallback(async (request) => {
      const decodedUrl = getDecodedProxiedURL(request.url);

      try {
        const requestBodyText = await request.body.getText();
        if (!requestBodyText) {
          logger.warn('Empty request body for', decodedUrl);
          return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Empty request body' }),
          };
        }
        const requestBodyJson = JSON.parse(requestBodyText);

        // Clone objects to avoid mutations
        const requestToCheck = JSON.parse(JSON.stringify(requestBodyJson));
        const expectedRequest = JSON.parse(JSON.stringify(requestBody));

        // Remove ignored fields from both objects for comparison
        ignoreFields.forEach((field) => {
          deleteNestedProperty(requestToCheck, field);
          deleteNestedProperty(expectedRequest, field);
        });

        // Check if the request body matches the expected body
        const matches = deepMatch(requestToCheck, expectedRequest);

        if (!matches) {
          logger.warn('❌ Request body validation failed for', decodedUrl);
          logger.debug('Expected:', expectedRequest);
          logger.debug('Received:', requestToCheck);
          logger.debug('Ignored fields:', ignoreFields);
          return {
            statusCode,
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
        logger.error('Error parsing request body:', error);
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Invalid request body' }),
        };
      }
    });
};

/**
 * Helper function to delete a nested property using dot notation (lodash unset equivalent)
 * @param obj - The object to modify
 * @param path - The path to the property (e.g., 'params.0.blockOverrides')
 */
function deleteNestedProperty(obj: object, path: string): void {
  const keys = path.split('.');
  let current = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    // Handle both object properties and array indices
    if (
      current != null &&
      (typeof current === 'object' || Array.isArray(current))
    ) {
      if (Array.isArray(current) && /^\d+$/.test(key)) {
        // Convert string index to number for arrays
        const index = parseInt(key, 10);
        if (index >= 0 && index < current.length) {
          current = current[index];
        } else {
          return; // Index out of bounds
        }
      } else if (key in current) {
        current = current[key];
      } else {
        return; // Path doesn't exist
      }
    } else {
      return; // Path doesn't exist
    }
  }

  const lastKey = keys[keys.length - 1];
  if (
    current != null &&
    (typeof current === 'object' || Array.isArray(current))
  ) {
    if (Array.isArray(current) && /^\d+$/.test(lastKey)) {
      // Handle array index deletion
      const index = parseInt(lastKey, 10);
      if (index >= 0 && index < current.length) {
        current.splice(index, 1);
      }
    } else {
      delete current[lastKey];
    }
  }
}

/**
 * Helper function to perform deep matching between two objects (lodash isMatch equivalent)
 * @param received - The received object
 * @param expected - The expected object pattern
 * @returns true if the received object matches the expected pattern
 */
function deepMatch(received: any, expected: any): boolean {
  if (expected === received) return true;
  if (expected == null || received == null) return expected === received;

  if (Array.isArray(expected)) {
    if (!Array.isArray(received) || received.length !== expected.length) {
      return false;
    }
    return expected.every((item, index) => deepMatch(received[index], item));
  }

  if (typeof expected === 'object' && typeof received === 'object') {
    // Similar to lodash isMatch - received can have more properties than expected
    for (const key in expected) {
      if (!(key in received) || !deepMatch(received[key], expected[key])) {
        return false;
      }
    }
    return true;
  }

  return expected === received;
}

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
