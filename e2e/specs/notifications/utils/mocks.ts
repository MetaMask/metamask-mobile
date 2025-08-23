import type { Mockttp } from 'mockttp';
import {
  getMockFeatureAnnouncementResponse,
  getMockListNotificationsResponse,
  getMockMarkNotificationsAsReadResponse,
  createMockNotificationEthSent,
  createMockNotificationEthReceived,
  createMockNotificationERC20Sent,
  createMockNotificationERC20Received,
  createMockNotificationERC721Sent,
  createMockNotificationERC721Received,
  createMockNotificationERC1155Sent,
  createMockNotificationERC1155Received,
  createMockNotificationMetaMaskSwapsCompleted,
  createMockNotificationRocketPoolStakeCompleted,
  createMockNotificationRocketPoolUnStakeCompleted,
  createMockNotificationLidoStakeCompleted,
  createMockNotificationLidoWithdrawalRequested,
  createMockNotificationLidoReadyToBeWithdrawn,
  createMockNotificationLidoWithdrawalCompleted,
} from '@metamask/notification-services-controller/notification-services/mocks';
import {
  getMockUpdatePushNotificationLinksResponse,
  getMockCreateFCMRegistrationTokenResponse,
  getMockDeleteFCMRegistrationTokenResponse,
} from '@metamask/notification-services-controller/push-services/mocks';
import { getDecodedProxiedURL } from './helpers';
import { MockttpNotificationTriggerServer } from './mock-notification-trigger-server';
import { mockAuthServices } from '../../identity/utils/mocks';
import { setupMockRequest } from '../../../api-mocking/mockHelpers';

export const mockListNotificationsResponse = getMockListNotificationsResponse();
mockListNotificationsResponse.response = [
  createMockNotificationEthSent(),
  createMockNotificationEthReceived(),
  createMockNotificationERC20Sent(),
  createMockNotificationERC20Received(),
  createMockNotificationERC721Sent(),
  createMockNotificationERC721Received(),
  createMockNotificationERC1155Sent(),
  createMockNotificationERC1155Received(),
  createMockNotificationMetaMaskSwapsCompleted(),
  createMockNotificationRocketPoolStakeCompleted(),
  createMockNotificationRocketPoolUnStakeCompleted(),
  createMockNotificationLidoStakeCompleted(),
  createMockNotificationLidoWithdrawalRequested(),
  createMockNotificationLidoReadyToBeWithdrawn(),
  createMockNotificationLidoWithdrawalCompleted(),
].map((n, i) => {
  const date = new Date();
  date.setDate(date.getDate() - i);
  n.created_at = date.toString();
  n.unread = false;
  return n;
});

const mockFeatureAnnouncementResponse = getMockFeatureAnnouncementResponse();
mockFeatureAnnouncementResponse.url =
  mockFeatureAnnouncementResponse.url.replace(/:space_id.*/, '');
if (mockFeatureAnnouncementResponse.response.items?.[0]) {
  mockFeatureAnnouncementResponse.response.items[0].sys.createdAt =
    new Date().toString() as `${number}-${number}-${number}T${number}:${number}:${number}Z`;
}

export function getMockWalletNotificationItemIds() {
  return mockListNotificationsResponse.response.map((n) => n.id);
}

export function getMockFeatureAnnouncementItemId() {
  return (
    mockFeatureAnnouncementResponse.response.items?.at(0)?.fields?.id ??
    'DOES NOT EXIST'
  );
}

/**
 * E2E mock setup for notification APIs (Notifications, Push Notifications)
 *
 * @param {import('mockttp').Mockttp} server - obj used to mock our endpoints
 */
export async function mockNotificationServices(server: Mockttp) {
  await mockAuthServices(server);
  // Trigger Config
  await new MockttpNotificationTriggerServer().setupServer(server);

  const contentfulUrlRegex =
    /^https:\/\/cdn\.contentful\.com:443\/spaces\/[a-zA-Z0-9]+\/environments\/[a-zA-Z0-9]+\/entries\?.*$/;

  // Notifications
  await mockAPICall(server, mockFeatureAnnouncementResponse);
  await setupMockRequest(server, {
    url: contentfulUrlRegex,
    requestMethod: 'GET',
    response: mockFeatureAnnouncementResponse.response,
    responseCode: 200,
  });
  await mockAPICall(server, mockListNotificationsResponse);
  await mockAPICall(server, getMockMarkNotificationsAsReadResponse());

  // Push Notifications
  await mockAPICall(server, getMockUpdatePushNotificationLinksResponse());
  await mockAPICall(server, getMockCreateFCMRegistrationTokenResponse());
  await mockAPICall(server, getMockDeleteFCMRegistrationTokenResponse());
}

interface ResponseParam {
  requestMethod: 'GET' | 'POST' | 'PUT' | 'DELETE';
  url: string | RegExp;
  response: unknown;
}

export async function mockAPICall(server: Mockttp, response: ResponseParam) {
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

  await requestRuleBuilder
    ?.matching((request) => {
      const url = getDecodedProxiedURL(request.url);
      return url.includes(String(response.url));
    })
    .asPriority(999)
    .thenCallback((request) => {
      // eslint-disable-next-line no-console
      console.log(
        `Mocking ${request.method} request to: ${getDecodedProxiedURL(
          request.url,
        )}`,
      );
      return {
        statusCode: 200,
        json: response.response,
      };
    });
}
