import { getLocal } from 'mockttp';
import portfinder from 'portfinder';
import path from 'path';  // For resolving file paths
import fs from 'fs';      // For file system operations

const mockServer = getLocal();

export const startMockServer = async (events, port) => {
  // Find an available port if not provided
  port = port || await portfinder.getPortPromise();
  
  await mockServer.start(port);
  console.log(`Mockttp server running at http://localhost:${port}`);

  // Health check endpoint
  await mockServer.forGet('/health-check').thenReply(200, 'Mock server is running');

  // Set up mock events
  for (const event of events) {
    const { mockUrl, responseCode, responseBodyFile } = event;
    let responseBody = {};

    // Load response body from file if provided
    if (responseBodyFile) {
      const filePath = path.resolve(responseBodyFile);  // Resolve the full file path
      if (fs.existsSync(filePath)) {                    // Ensure the file exists
        responseBody = require(filePath);               // Load the file synchronously
      } else {
        console.warn(`Response body file not found at: ${filePath}`);
      }
    }

    // Set up the mock response for the URL, using query parameter matching if needed
    await mockServer.forGet('/proxy')
      .withQuery({ url: mockUrl })  // Match on the 'url' query parameter
      .thenReply(responseCode, JSON.stringify(responseBody));  // Return the mock response
      // console.log(`Mocking request to: ${method} ${url}`);

  }

  // Pass through unmatched requests and log them
  await mockServer.forUnmatchedRequest().thenPassThrough({
    beforeRequest: async ({ url, method }) => {
      console.log(`Forwarding request to: ${method} ${url}`);
      return { url: new URL(url).searchParams.get('url') || url };  // Pass through or adjust the URL
    },
  });

  return mockServer;
};

export const stopMockServer = async () => {
  await mockServer.stop();
  console.log('Mockttp server stopped');
};
