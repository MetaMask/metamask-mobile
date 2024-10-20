/* eslint-disable no-console */
import { getLocal } from 'mockttp';
import { defaultMockPort } from './mockUrlCollection';
import portfinder from 'portfinder';
import { Platform } from 'react-native';

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
      let newUrl = url;
      // Check if Platform is Android and URL contains localhost
      if (device.getPlatform() === 'android' && newUrl.includes('localhost')) {
        newUrl = newUrl.replace('localhost', '10.0.2.2');
      }
      console.log(`Forwarding request to: ${method} ${newUrl}`);
      return { url: new URL(newUrl).searchParams.get('url') || newUrl };
    },
  });

  return mockServer;
};

export const stopMockServer = async () => {
  await mockServer.stop();
  console.log('Mockttp server shutting down');
};
