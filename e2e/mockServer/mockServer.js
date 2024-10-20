/* eslint-disable no-console */
import { getLocal } from 'mockttp';
import { defaultMockPort } from './mockUrlCollection';
import portfinder from 'portfinder';

const mockServer = getLocal();

export const startMockServer = async ({
  mockUrl,
  responseCode = 500,
  responseBody = {},
  port = defaultMockPort,
}) => {
  if (!mockUrl) throw new Error('The mockUrl parameter is required');
  await portfinder.setBasePort(port);
  const mockPort = await portfinder.getPortPromise();
  await mockServer.start(mockPort);
  console.log(`Mockttp server running at http://localhost:${mockPort}`);

  await mockServer
    .forGet('/health-check')
    .thenReply(200, 'Mock server is running');

  await mockServer
    .forGet('/proxy')
    .withQuery({ url: mockUrl })
    .thenReply(responseCode, JSON.stringify(responseBody));

    await mockServer.forUnmatchedRequest().thenPassThrough({
      beforeRequest: async ({ url, method }) => {
        const parsedUrl = new URL(url);
        const returnUrl = parsedUrl.searchParams.get('url') || url;
    
        // Replace 'localhost' with the Android local IP
        const updatedUrl = returnUrl.replace('localhost', '127.0.0.1');
    
        // Log just the updated URL
        console.log(`Updated URL: ${updatedUrl}`);
    
        return { url: updatedUrl };
      },
    });
    
    

  return mockServer;
};

export const stopMockServer = async () => {
  await mockServer.stop();
  console.log('Mockttp server shutting down');
};