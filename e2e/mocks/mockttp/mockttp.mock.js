// const mockttp = require('mockttp');

// // Create a Mockttp server instance
// const mockServer = mockttp.getLocal();

// // Start the Mockttp server
// mockServer.start(8000).then(async () => {
//   console.log(`Mockttp proxy server running at http://localhost:${mockServer.port}`);

//   // Intercept all requests, log them, and then forward to the original destination
//   await mockServer.forAnyRequest().thenPassThrough({
//     beforeRequest: async (req) => {
//       const originalUrl = new URL(req.url).searchParams.get('url'); // Extract original URL from the query parameter
//       console.log(`Forwarding request: ${req.method} ${originalUrl}`);
//       return {
//         url: originalUrl || req.url, // Use the original URL or fallback to the current URL
//       };
//     }
//   });

//   console.log('Mockttp server is set up to forward requests to their original destination.');
// }).catch(err => {
//   console.error('Error starting the Mockttp server:', err);
// });


const mockttp = require('mockttp');

// Create a Mockttp server instance
const mockServer = mockttp.getLocal();

// Start the Mockttp server
mockServer.start(8000).then(async () => {
  console.log(`Mockttp proxy server running at http://localhost:${mockServer.port}`);

  // Intercept all requests, log them, and then forward to the original destination
  await mockServer.forAnyRequest().thenPassThrough({
    beforeRequest: async (req) => {
      const originalUrl = new URL(req.url).searchParams.get('url'); // Extract original URL from the query parameter
      console.log(`Forwarding request: ${req.method} ${originalUrl}`);
      return {
        url: originalUrl || req.url, // Use the original URL or fallback to the current URL
      };
    }
  });

  console.log('Mockttp server is set up to forward requests to their original destination.');
}).catch(err => {
  console.error('Error starting the Mockttp server:', err);
});
