import { getLocal } from 'mockttp';
import portfinder from 'portfinder';
import path from 'path';  // Add path to help with file paths if necessary
import fs from 'fs';      // Optionally use fs to check file existence

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
    let responseBody = {};

    // Use require instead of dynamic import
    if (responseBodyFile) {
      const filePath = path.resolve(responseBodyFile);  // Resolve the full path
      if (fs.existsSync(filePath)) {                    // Check if file exists
        responseBody = require(filePath);               // Load the file synchronously
      }
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
