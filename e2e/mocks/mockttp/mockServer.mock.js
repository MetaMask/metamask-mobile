const mockttp = require('mockttp');

Create and start a Mockttp server instance
const mockServer = mockttp.getLocal();

mockServer.start(8000)
  .then(() => {
    console.log(`Mockttp proxy server running at http://localhost:${mockServer.port}`);

    // Set up interception and response for a specific path
    mockServer.forGet("/networks/1/suggestedGasFees").thenReply(500, "A mocked response");

    // Forward all other requests
    return mockServer.forAnyRequest().thenPassThrough({
      beforeRequest: async ({ url, method }) => {
        const originalUrl = new URL(url).searchParams.get('url');
        console.log(`Forwarding request: ${method} ${originalUrl || url}`);

        return { url: originalUrl || url };
      }
    });
  })
  .then(() => {
    console.log('Mockttp server is set up to mock specific paths and forward other requests.');
  })
  .catch(err => {
    console.error('Error starting the Mockttp server:', err);
  });