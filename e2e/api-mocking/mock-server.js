/* eslint-disable no-console */
import { getLocal } from 'mockttp';
import portfinder from 'portfinder';

const mockServer = getLocal();

/**
 * Starts the mock server and sets up mock events.
 *
 * @param {Object} events - The events to mock, organised by method.
 * @param {number} [port] - Optional port number. If not provided, a free port will be used.
 * @returns {Promise} Resolves to the running mock server.
 */
export const startMockServer = async (events, port) => {
  port = port || (await portfinder.getPortPromise());

  await mockServer.start(port);
  await mockServer.enableDebug();
  console.log(`Mockttp server running at http://localhost:${port}`);

  await mockServer
    .forGet('/health-check')
    .thenReply(200, 'Mock server is running');

  for (const method in events) {
    const methodEvents = events[method];

    console.log(`Setting up mock events for ${method} requests...`);

    for (const {
      urlEndpoint,
      response,
      requestBody,
      responseCode,
    } of methodEvents) {
      console.log(`Mocking ${method} request to: ${urlEndpoint}`);
      console.log(`Response status: ${responseCode}`);
      console.log('Response:', response);
      if (requestBody) {
        console.log(`POST request body:`, requestBody);
      }

      if (method === 'GET') {
        await mockServer
          .forGet('/proxy')
          .withQuery({ url: urlEndpoint })
          .thenReply(responseCode, JSON.stringify(response));
      }

      if (method === 'POST') {
        await mockServer
          .forPost('/proxy')
          .withQuery({ url: urlEndpoint })
          .withJsonBodyIncluding(requestBody || {})
          .thenReply(responseCode, JSON.stringify(response));
      }
    }
  }

  // Log unmatched POST requests that contain urlEndpoint
  mockServer.on('request', async (req) => {
    if (req.method === 'POST') {
      const body = await req.body.getJson();
      const url = new URL(req.url).searchParams.get('url') || req.url;

      // Check if the URL contains any of the urlEndpoints
      for (const method in events) {
        const methodEvents = events[method];
        for (const { urlEndpoint } of methodEvents) {
          if (url.includes(urlEndpoint)) {
            console.log(`Unmatched POST request to >>>> ${url}`);
            console.log(`Request body >>>>`, body);
            break;
          }
        }
      }
    }
  });

  await mockServer.forUnmatchedRequest().thenPassThrough({
    beforeRequest: async ({ url, method }) => {
      const returnUrl = new URL(url).searchParams.get('url') || url;
      const updatedUrl =
        device.getPlatform() === 'android'
          ? returnUrl.replace('localhost', '127.0.0.1')
          : returnUrl;
      console.log(`Mock proxy forwarding request to: ${updatedUrl}`);
      return { url: updatedUrl };
    },
  });

  return mockServer;
};

/**
 * Stops the mock server.
 *
 */
export const stopMockServer = async () => {
  await mockServer.stop();
  console.log('Mock server shutting down');
};
