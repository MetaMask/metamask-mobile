/* eslint-disable no-console */
import { getLocal } from 'mockttp';
import portfinder from 'portfinder';

const mockServer = getLocal();
export const DEFAULT_MOCKSERVER_PORT = 8000;

/**
 * Starts the mock server and sets up mock events.
 * 
 * @param {Object} events - The events to mock, organized by method.
 * @param {number} [port] - Optional port number. If not provided, a free port will be used.
 * @returns {Promise} Resolves to the running mock server.
 */
export const startMockServer = async (events, port) => {
  port = port || await portfinder.getPortPromise();

  await mockServer.start(port);
  console.log(`Mockttp server running at http://localhost:${port}`);

  await mockServer.forGet('/health-check').thenReply(200, 'Mock server is running');

  // Loop through the events based on HTTP methods
  for (const method in events) {
    const methodEvents = events[method];

    // Loop through each event in methodEvents (which is an object, not an array)
    for (const eventKey in methodEvents) {
      const { urlEndpoint, response, requestBody } = methodEvents[eventKey];

      // Ensure response is defined
      if (!response) {
        console.log(`No response defined for ${urlEndpoint}`);
        continue; // Skip this event if response is undefined
      }

      const responseCode = response.status || 200;

      console.log('Response status:', response.status);
      console.log('Response:', response);

      // Handle GET requests
      if (method === 'GET') {
        await mockServer.forGet('/proxy')
          .withQuery({ url: urlEndpoint })
          .thenReply(responseCode, JSON.stringify(response));
      }

      // Handle POST requests
      if (method === 'POST') {
        await mockServer.forPost('/proxy')
          .withQuery({ url: urlEndpoint })
          .withJsonBody(requestBody || {}) // Use the requestBody from the event
          .thenReply(responseCode, JSON.stringify(response));
      }
    }
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
