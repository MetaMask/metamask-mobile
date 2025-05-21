/* eslint-disable no-console */
import { getLocal } from 'mockttp';
import portfinder from 'portfinder';
import _ from 'lodash';
import { device } from 'detox';

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

      const regex = new RegExp('getTxStatus');
      console.log(urlEndpoint);
      if (regex.test(urlEndpoint)) {
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
        (event) => event.urlEndpoint === urlEndpoint,
      );

      if (matchingEvent) {
        console.log(`Mocking ${method} request to: ${urlEndpoint}`);
        console.log(`Response status: ${matchingEvent.responseCode}`);
        console.log('Response:', matchingEvent.response);

        return {
          statusCode: matchingEvent.responseCode,
          body: JSON.stringify(matchingEvent.response),
        };
      }

      // If no matching mock found, pass through to actual endpoint
      const updatedUrl =
        device.getPlatform() === 'android'
          ? urlEndpoint.replace('localhost', '127.0.0.1')
          : urlEndpoint;

      return handleDirectFetch(
        updatedUrl,
        method,
        request.headers,
        method === 'POST' ? await request.body.getText() : undefined,
      );
    });

  // In case any other requests are made, pass them through to the actual endpoint
  await mockServer
    .forUnmatchedRequest()
    .thenCallback(async (request) =>
      handleDirectFetch(
        request.url,
        request.method,
        request.headers,
        await request.body.getText(),
      ),
    );

  return mockServer;
};
