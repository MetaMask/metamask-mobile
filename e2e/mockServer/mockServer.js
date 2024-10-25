/* eslint-disable no-console */
import { getLocal } from 'mockttp';
import { defaultMockPort } from './mockUrlCollection';
import portfinder from 'portfinder';
import { mockNotificationServices } from '../specs/notifications/mocks';
import { UserStorageMockttpController } from '../utils/user-storage/userStorageMockttpController';

const mockServer = getLocal();

export const startMockServer = async ({
  mockUrl,
  responseCode = 500,
  responseBody = {},
  port = defaultMockPort,
  // overrides = {
  //   userStorageMockttpController: new UserStorageMockttpController(),
  // },
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

  // // Mock all notifications related services (Auth, UserStorage, Notifications, Push Notifications, Profile syncing)
  // await mockNotificationServices(
  //   mockServer,
  //   overrides?.userStorageMockttpController,
  // );

  await mockServer.forUnmatchedRequest().thenPassThrough({
    beforeRequest: async ({ url, method }) => {
      const returnUrl = new URL(url).searchParams.get('url') || url;
      const updatedUrl =
        device.getPlatform() === 'android'
          ? returnUrl.replace('localhost', '127.0.0.1')
          : returnUrl;

      console.log(`Mock proxy forwarding request to: ${updatedUrl}`);
      return { url: updatedUrl };
    },
  });

  return mockServer;
};

export const stopMockServer = async () => {
  await mockServer.stop();
  console.log('Mockttp server shutting down');
};
