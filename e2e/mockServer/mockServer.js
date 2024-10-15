import { getLocal } from 'mockttp';
import portfinder from 'portfinder';

const mockServer = getLocal();

export const startMockServer = async (events, port) => {
  // Find an available port
  port = port || await portfinder.getPortPromise();
  
  await mockServer.start(port);
  console.log(`Mockttp server running at http://localhost:${port}`);

  // Health check endpoint
  await mockServer.forGet('/health-check').thenReply(200, 'Mock server is running');

  // Set up mock events
  for (const event of events) {
    const { mockUrl, responseCode, responseBodyFile } = event;
    let responseBody;

    // Dynamically import the response body from the file
    if (responseBodyFile) {
      responseBody = (await import(responseBodyFile)).default; // Adjust based on your exports
    } else {
      responseBody = {};
    }

    await mockServer.forGet(mockUrl).thenReply(responseCode, JSON.stringify(responseBody));
  }

  await mockServer.forUnmatchedRequest().thenPassThrough({
    beforeRequest: async ({ url, method }) => {
      console.log(`Forwarding request to: ${method} ${url}`);
      return { url: new URL(url).searchParams.get('url') || url };
    },
  });

  return mockServer;
};

export const stopMockServer = async () => {
  await mockServer.stop();
  console.log('Mockttp server stopped');
};
