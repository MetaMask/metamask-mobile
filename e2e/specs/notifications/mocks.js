import { AuthenticationController } from '@metamask/profile-sync-controller';
import {
  NotificationServicesController,
  NotificationServicesPushController,
} from '@metamask/notification-services-controller';
import { UserStorageMockttpController } from '../../utils/user-storage/userStorageMockttpController';

const AuthMocks = AuthenticationController.Mocks;
const NotificationMocks = NotificationServicesController.Mocks;
const PushMocks = NotificationServicesPushController.Mocks;

/**
 * E2E mock setup for notification APIs (Auth, UserStorage, Notifications, Push Notifications, Profile syncing)
 *
 * @param server - server obj used to mock our endpoints
 * @param userStorageMockttpController - optional controller to mock user storage endpoints
 */
export async function mockNotificationServices(server) {
  // Auth
  mockAPICall(server, AuthMocks.getMockAuthNonceResponse());
  mockAPICall(server, AuthMocks.getMockAuthLoginResponse());
  mockAPICall(server, AuthMocks.getMockAuthAccessTokenResponse());

  // Storage
  const userStorageMockttpControllerInstance =
    new UserStorageMockttpController();

  userStorageMockttpControllerInstance.setupPath('accounts', server);
  userStorageMockttpControllerInstance.setupPath('networks', server);
  userStorageMockttpControllerInstance.setupPath('notifications', server);

  // Notifications
  mockAPICall(server, NotificationMocks.getMockFeatureAnnouncementResponse());
  mockAPICall(server, NotificationMocks.getMockBatchCreateTriggersResponse());
  mockAPICall(server, NotificationMocks.getMockBatchDeleteTriggersResponse());
  mockAPICall(server, NotificationMocks.getMockListNotificationsResponse());
  mockAPICall(
    server,
    NotificationMocks.getMockMarkNotificationsAsReadResponse(),
  );

  // Push Notifications
  mockAPICall(server, PushMocks.getMockRetrievePushNotificationLinksResponse());
  mockAPICall(server, PushMocks.getMockUpdatePushNotificationLinksResponse());
  mockAPICall(server, PushMocks.getMockCreateFCMRegistrationTokenResponse());
  mockAPICall(server, PushMocks.getMockDeleteFCMRegistrationTokenResponse());

  return {
    userStorageMockttpControllerInstance,
  };
}

function mockAPICall(server, response) {
  let requestRuleBuilder;

  if (response.requestMethod === 'GET') {
    requestRuleBuilder = server.forGet('/proxy');
  }

  if (response.requestMethod === 'POST') {
    requestRuleBuilder = server.forPost('/proxy');
  }

  if (response.requestMethod === 'PUT') {
    requestRuleBuilder = server.forPut('/proxy');
  }

  if (response.requestMethod === 'DELETE') {
    requestRuleBuilder = server.forDelete('/proxy');
  }

  requestRuleBuilder
    ?.matching((request) => {
      const url = decodeURIComponent(
        String(new URL(request.url).searchParams.get('url')),
      );

      return url.includes(String(response.url));
    })
    .thenCallback(() => ({
      statusCode: 200,
      json: response.response,
    }));
}
