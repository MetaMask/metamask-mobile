/* eslint-disable no-console */
import { getLocal } from 'mockttp';
import portfinder from 'portfinder';

/**
 * Starts the API monitoring server to log all API calls.
 *
 * @param {number} [port] - Optional port number. If not provided, a free port will be used.
 * @returns {Promise} Resolves to the running mock server.
 */
export const startApiMonitor = async (port) => {
  const mockServer = getLocal();
  port = port || (await portfinder.getPortPromise());

  await mockServer.start(port);
  console.log(`\n🚀 API Monitor running at http://localhost:${port}\n`);

  await mockServer
    .forGet('/health-check')
    .thenReply(200, 'API Monitor is running');

  await mockServer.forUnmatchedRequest().thenPassThrough({
    beforeRequest: async ({ url, method, rawHeaders, requestBody }) => {
      const returnUrl = new URL(url).searchParams.get('url') || url;
      
      // TODO: find a way to get the platform from the app
      const platform = 'ios';
      const updatedUrl =
        platform === 'android'
          ? returnUrl.replace('localhost', '127.0.0.1')
          : returnUrl;
      
      console.log('\n📡 API Request:');
      console.log('----------------------------------------');
      console.log(`Method: ${method}`);
      console.log(`URL: ${updatedUrl}`);
      
      if (rawHeaders) {
        console.log('\nHeaders:');
        console.log(JSON.stringify(rawHeaders, null, 2));
      }

      if (requestBody) {
        try {
          const body = await requestBody.getJson();
          console.log('\nRequest Body:');
          console.log(JSON.stringify(body, null, 2));
        } catch (e) {
          console.log('\nRequest Body: (Raw)');
          console.log(JSON.stringify(await requestBody.getText(), null, 2));
        }
      }
      console.log('----------------------------------------\n');

      return { url: updatedUrl };
    },
    beforeResponse: async ({ statusCode, headers, body, statusMessage }) => {
      console.log('📥 API Response:');
      console.log('----------------------------------------');
      console.log(`Status: ${statusCode} ${statusMessage}`);
      
      if (headers) {
        console.log('\nHeaders:');
        console.log(JSON.stringify(headers, null, 2));
      }

      try {
        console.log('\nResponse Body:');
        console.log(body);
      } catch (e) {
        console.log('\nResponse Body Error:');
        console.log(e);
      }
      console.log('----------------------------------------\n');
    },
  });

  return mockServer;
};

/**
 * Stops the API monitoring server.
 *
 */
export const stopApiMonitor = async (mockServer) => {
  await mockServer.stop();
  console.log('🛑 API Monitor shutting down');
}; 