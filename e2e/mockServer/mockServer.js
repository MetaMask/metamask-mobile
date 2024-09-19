/* eslint-disable no-console */
import { getLocal } from 'mockttp';
import { defaultMockPort } from './mockUrlCollection';

const mockServer = getLocal();

export const startMockServer = async ({
  mockUrl,
  responseCode = 500,
  responseBody = {},
  port = defaultMockPort,
}) => {
  if (!mockUrl) throw new Error('The mockUrl parameter is required');

  await mockServer.start(port);
  console.log(`Mockttp server running at http://localhost:${port}`);

  await mockServer
    .forGet('/health-check')
    .thenReply(200, 'Mock server is running');

  await mockServer
    .forGet('/proxy')
    .withQuery({ url: mockUrl })
    .thenReply(responseCode, JSON.stringify(responseBody));

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
