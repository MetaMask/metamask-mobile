// @ts-check
import {
  getMockAuthNonceResponse,
  getMockAuthLoginResponse,
  getMockAuthAccessTokenResponse,
} from '@metamask/profile-sync-controller/auth/mocks';
import {
  getMockFeatureAnnouncementResponse,
  getMockBatchCreateTriggersResponse,
  getMockBatchDeleteTriggersResponse,
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
  getMockRetrievePushNotificationLinksResponse,
  getMockUpdatePushNotificationLinksResponse,
  getMockCreateFCMRegistrationTokenResponse,
  getMockDeleteFCMRegistrationTokenResponse,
} from '@metamask/notification-services-controller/push-services/mocks';
import { UserStorageMockttpController } from '../../identity/utils/user-storage/userStorageMockttpController';
import { getDecodedProxiedURL } from './helpers';
import { USER_STORAGE_FEATURE_NAMES } from '@metamask/profile-sync-controller/sdk';
import { encryptedStorageWithTriggers } from './mock-user-storage-data';
import { NOTIFICATION_STORAGE_HASHED_KEY } from './constants';

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
];

const mockFeatureAnnouncementResponse = getMockFeatureAnnouncementResponse();
mockFeatureAnnouncementResponse.url =
  mockFeatureAnnouncementResponse.url.replace(/:space_id.*/, '');

export function getMockWalletNotificationItemId() {
  return (
    mockListNotificationsResponse.response.find(
      (n) => n.data.kind === 'erc1155_sent',
    )?.id ?? 'DOES NOT EXIST'
  );
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
export async function mockNotificationServices(server) {
  // Auth
  mockAPICall(server, getMockAuthNonceResponse());
  mockAPICall(server, getMockAuthLoginResponse());
  mockAPICall(server, getMockAuthAccessTokenResponse());

  // User Storage
  const userStorageMockttpControllerInstance =
    new UserStorageMockttpController();

  const initialEncryptedTriggers = await encryptedStorageWithTriggers();
  await userStorageMockttpControllerInstance.setupPath(
    USER_STORAGE_FEATURE_NAMES.notifications,
    server,
    {
      getResponse: [
        {
          HashedKey: NOTIFICATION_STORAGE_HASHED_KEY,
          Data: initialEncryptedTriggers,
        },
      ],
    },
  );

  // Notifications
  mockAPICall(server, mockFeatureAnnouncementResponse);
  mockAPICall(server, getMockBatchCreateTriggersResponse());
  mockAPICall(server, getMockBatchDeleteTriggersResponse());
  mockAPICall(server, mockListNotificationsResponse);
  mockAPICall(server, getMockMarkNotificationsAsReadResponse());

  // Push Notifications
  mockAPICall(server, getMockRetrievePushNotificationLinksResponse());
  mockAPICall(server, getMockUpdatePushNotificationLinksResponse());
  mockAPICall(server, getMockCreateFCMRegistrationTokenResponse());
  mockAPICall(server, getMockDeleteFCMRegistrationTokenResponse());

  return {
    userStorageMockttpControllerInstance,
  };
}

/**
 *
 * @param {import('mockttp').Mockttp} server
 * @param {{
 *   requestMethod: 'GET' | 'POST' | 'PUT' | 'DELETE';
 *   url: string | RegExp;
 *   response: unknown;
 * }} response
 */
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
      const url = getDecodedProxiedURL(request.url);

      return url.includes(String(response.url));
    })
    .thenCallback(() => ({
      statusCode: 200,
      json: response.response,
    }));
}
