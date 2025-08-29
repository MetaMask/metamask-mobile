import { getLocal } from 'mockttp';
import portfinder from 'portfinder';
import { createLogger, LogLevel } from '../../framework/logger';

interface MockEvent {
  urlEndpoint: string;
  responseCode: number;
  response: unknown;
}

interface MockEvents {
  [key: string]: MockEvent[];
}

const logger = createLogger({
  name: 'BridgeMocks',
  level: LogLevel.INFO,
});

/**
 * Utility function to handle direct fetch requests
 * @param {string} url - The URL to fetch from
 * @param {string} method - The HTTP method
 * @param {Headers} headers - Request headers
 * @param {string | undefined} requestBody - The request body as string
 * @returns {Promise<{statusCode: number, body: string}>} Response object
 */
const handleDirectFetch = async (
  url: string,
  method: string,
  headers: Headers,
  requestBody: string | undefined,
) => {
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
 * Starts the mock server and sets up mock events.
 *
 * @param {MockEvents} events - The events to mock, organised by method.
 * @param {number} [port] - Optional port number. If not provided, a free port will be used.
 * @returns {Promise} Resolves to the running mock server.
 */
export const startMockServer = async (events: MockEvents, port: number) => {
  const mockServer = getLocal();
  port = port || (await portfinder.getPortPromise());

  await mockServer.start(port);
  logger.info(`Mockttp server running at http://localhost:${port}`);

  await mockServer
    .forGet('/health-check')
    .thenReply(200, 'Mock server is running');

  // Handle all /proxy requests
  await mockServer
    .forAnyRequest()
    .matching((request) => request.path.startsWith('/proxy'))
    .thenCallback(async (request) => {
      const urlParam = new URL(request.url).searchParams.get('url');
      if (!urlParam) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Missing url parameter' }),
        };
      }
      let urlEndpoint: string = urlParam;
      const method = request.method;

      // Mocking the getTxStatus on the destination transaction
      if (urlEndpoint.includes('getTxStatus')) {
        const urlObj = new URL(urlEndpoint);
        const txHash = urlObj.searchParams.get('srcTxHash');
        const srcChainId = urlObj.searchParams.get('srcChainId');
        const destChainId = urlObj.searchParams.get('destChainId');
        return {
          statusCode: 200,
          json: {
            status: 'COMPLETE',
            isExpectedToken: true,
            bridge: 'lifi',
            srcChain: {
              chainId: srcChainId,
              txHash,
            },
            destChain: {
              chainId: destChainId,
              txHash,
            },
          },
        };
      }

      // Find matching mock event
      const methodEvents = events[method] || [];
      const matchingEvent = methodEvents.find(
        (event: MockEvent) => event.urlEndpoint === urlEndpoint,
      );

      if (matchingEvent) {
        logger.info(`Mocking ${method} request to: ${urlEndpoint}`);
        logger.info(`Response status: ${matchingEvent.responseCode}`);
        logger.debug('Response:', matchingEvent.response);

        return {
          statusCode: matchingEvent.responseCode,
          body: JSON.stringify(matchingEvent.response),
        };
      }

      // Needed in order to get a quote for locahost
      if (urlEndpoint.includes('getQuote')) {
        urlEndpoint = urlEndpoint.replace(
          'insufficientBal=false',
          'insufficientBal=true',
        );
      }
      // If no matching mock found, pass through to actual endpoint
      const updatedUrl =
        device.getPlatform() === 'android'
          ? urlEndpoint.replace('localhost', '127.0.0.1')
          : urlEndpoint;

      const requestBody =
        method === 'POST' ? await request.body.getText() : undefined;
      const headerEntries = Object.entries(request.headers)
        .filter((entry): entry is [string, string] => {
          const value = entry[1];
          return value !== undefined && typeof value === 'string';
        })
        .map(([key, value]) => [key, value] as [string, string]);
      const headers = new Headers(headerEntries);

      return handleDirectFetch(updatedUrl, method, headers, requestBody);
    });

  // In case any other requests are made, pass them through to the actual endpoint
  await mockServer.forUnmatchedRequest().thenCallback(async (request) => {
    const headerEntries = Object.entries(request.headers)
      .filter((entry): entry is [string, string] => {
        const value = entry[1];
        return value !== undefined && typeof value === 'string';
      })
      .map(([key, value]) => [key, value] as [string, string]);
    const headers = new Headers(headerEntries);
    return handleDirectFetch(
      request.url,
      request.method,
      headers,
      await request.body.getText(),
    );
  });

  return mockServer;
};
