const mockttp = require('mockttp');

const startServer = async () => {
  // Create and start a Mockttp server instance
  const mockServer = mockttp.getLocal();

  mockServer.enableDebug();

  await mockServer.start(8000);

  console.log(
    `Mockttp proxy server running at http://localhost:${mockServer.port}`,
  );

  // This is a rule where the path is /proxy and a query param is https://www.google.com
  // Docs - https://httptoolkit.github.io/mockttp/interfaces/Mockttp.html
  await mockServer
    .forGet('/proxy')
    .withQuery({ url: 'https://www.google.com' })
    .thenReply(500);

  // Add other rules here...
  // await mockServer
  //   .forGet('/proxy')
  //   .withQuery({ url: 'https://www.website.com/networks/1/suggestedGasFees' })
  //   .thenReply(500);

  // Unmatched rules falls back to this and is passed through normally
  await mockServer.forUnmatchedRequest().thenPassThrough({
    beforeRequest: async ({ url, method }) => {
      const originalUrl = new URL(url).searchParams.get('url');
      console.log(`Forwarding request to: ${method} ${url}`);

      return { url: originalUrl || url };
    },
  });
};

startServer().catch((e) => {
  console.log('Error starting server', e);
});
