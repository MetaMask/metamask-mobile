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

export async function mockAPICall(server: Mockttp, response: ResponseParam) {
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
        return response.url.test(url);
      }
      return url.includes(String(response.url));
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
