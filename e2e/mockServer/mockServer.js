/* eslint-disable no-console */
import { getLocal } from 'mockttp';
import portfinder from 'portfinder';

const mockServer = getLocal();
export const DEFAULT_MOCKSERVER_PORT = 8000;

/**
 * Starts the mock server and sets up mock events.
 * 
 * @param {Array} events - The events to mock.
 * @param {number} [port] - Optional port number. If not provided, a free port will be used.
 * @returns {Promise} Resolves to the running mock server.
 */
export const startMockServer = async (events, port) => {
  port = port || await portfinder.getPortPromise();

  await mockServer.start(port);
  console.log(`Mockttp server running at http://localhost:${port}`);

  await mockServer.forGet('/health-check').thenReply(200, 'Mock server is running');

  for (const event of events) {
    const { urlEndpoint, response } = event;

    const responseCode = response.status || 200;

    await mockServer.forGet('/proxy')
      .withQuery({ url: urlEndpoint })
      .thenReply(responseCode, JSON.stringify(response));
  }

  await mockServer.forUnmatchedRequest().thenPassThrough({
    beforeRequest: async ({ url }) => {
      const returnUrl = new URL(url).searchParams.get('url') || url;
      const updatedUrl = device.getPlatform() === 'android' ? returnUrl.replace('localhost', '127.0.0.1') : returnUrl;

      console.log(`Mock proxy forwarding request to: ${updatedUrl}`);
      return { url: updatedUrl };
    },
  });

  return mockServer;
};

/**
 * Stops the mock server.
 * 
 * @returns {Promise} Resolves when the server has stopped.
 */
export const stopMockServer = async () => {
  await mockServer.stop();
  console.log('Mock server shutting down');
};
