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

  // Intercept all requests and responses, and then forward to the original destination
  await mockServer.forAnyRequest().thenPassThrough({
    // Handle the request before passing it through
    beforeRequest: async (req) => {
      // Extract the original URL from the query parameter
      const originalUrl = new URL(req.url).searchParams.get('url');
      console.log(`Forwarding request: ${req.method} ${originalUrl}`);
      
      // Return the request object with the original URL or fallback to the current URL
      return {
        url: originalUrl || req.url,
      };
    },
    // Handle the response before sending it to the client
    beforeResponse: async (res) => {
      console.log(`Received response: ${res.statusCode} for ${res.url}`);
      
      // Optionally, you can manipulate the response here if needed
      
      return res; // Forward the response to the client
    }
  });

  console.log('Mockttp server is set up to proxy requests and handle responses.');
}).catch(err => {
  console.error('Error starting the Mockttp server:', err);
});

