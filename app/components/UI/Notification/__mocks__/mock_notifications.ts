import { processNotification } from '@metamask/notification-services-controller/notification-services';
// eslint-disable-next-line import/no-namespace
import * as Mocks from '@metamask/notification-services-controller/notification-services/mocks';

export const MOCK_ON_CHAIN_NOTIFICATIONS = [
  processNotification(Mocks.createMockNotificationEthSent()),
  processNotification(Mocks.createMockNotificationEthReceived()),
  processNotification(Mocks.createMockNotificationERC20Sent()),
  processNotification(Mocks.createMockNotificationERC20Received()),
  processNotification(Mocks.createMockNotificationERC721Sent()),
  processNotification(Mocks.createMockNotificationERC721Received()),
  processNotification(Mocks.createMockNotificationERC1155Sent()),
  processNotification(Mocks.createMockNotificationERC1155Received()),
  processNotification(Mocks.createMockNotificationMetaMaskSwapsCompleted()),
  processNotification(Mocks.createMockNotificationRocketPoolStakeCompleted()),
  processNotification(Mocks.createMockNotificationRocketPoolUnStakeCompleted()),
  processNotification(Mocks.createMockNotificationLidoStakeCompleted()),
  processNotification(Mocks.createMockNotificationLidoWithdrawalRequested()),
  processNotification(Mocks.createMockNotificationLidoReadyToBeWithdrawn()),
  processNotification(Mocks.createMockNotificationLidoWithdrawalCompleted()),
];

export const MOCK_FEATURE_ANNOUNCEMENT_NOTIFICATIONS = [
  processNotification(Mocks.createMockFeatureAnnouncementRaw()),
];

const MOCK_NOTIFICATIONS = [
  ...MOCK_ON_CHAIN_NOTIFICATIONS,
  ...MOCK_FEATURE_ANNOUNCEMENT_NOTIFICATIONS,
];

export const createMockNotificationEthSent = () =>
  processNotification(Mocks.createMockNotificationEthSent());
export const createMockNotificationEthReceived = () =>
  processNotification(Mocks.createMockNotificationEthReceived());
export const createMockNotificationERC20Sent = () =>
  processNotification(Mocks.createMockNotificationERC20Sent());
export const createMockNotificationERC20Received = () =>
  processNotification(Mocks.createMockNotificationERC20Received());
export const createMockNotificationERC721Sent = () =>
  processNotification(Mocks.createMockNotificationERC721Sent());
export const createMockNotificationERC721Received = () =>
  processNotification(Mocks.createMockNotificationERC721Received());
export const createMockNotificationERC1155Sent = () =>
  processNotification(Mocks.createMockNotificationERC1155Sent());
export const createMockNotificationERC1155Received = () =>
  processNotification(Mocks.createMockNotificationERC1155Received());
export const createMockNotificationMetaMaskSwapsCompleted = () =>
  processNotification(Mocks.createMockNotificationMetaMaskSwapsCompleted());
export const createMockNotificationRocketPoolStakeCompleted = () =>
  processNotification(Mocks.createMockNotificationRocketPoolStakeCompleted());
export const createMockNotificationRocketPoolUnStakeCompleted = () =>
  processNotification(Mocks.createMockNotificationRocketPoolUnStakeCompleted());
export const createMockNotificationLidoStakeCompleted = () =>
  processNotification(Mocks.createMockNotificationLidoStakeCompleted());
export const createMockNotificationLidoWithdrawalRequested = () =>
  processNotification(Mocks.createMockNotificationLidoWithdrawalRequested());
export const createMockNotificationLidoReadyToBeWithdrawn = () =>
  processNotification(Mocks.createMockNotificationLidoReadyToBeWithdrawn());
export const createMockNotificationLidoWithdrawalCompleted = () =>
  processNotification(Mocks.createMockNotificationLidoWithdrawalCompleted());
export const createMockFeatureAnnouncementRaw = () =>
  processNotification(Mocks.createMockFeatureAnnouncementRaw());

export const mockNotificationsWithMetaData = [
  {
    notification: processNotification(Mocks.createMockNotificationEthSent()),
    hasModal: true,
  },
  {
    notification: processNotification(
      Mocks.createMockNotificationEthReceived(),
    ),
    hasModal: true,
  },
  {
    notification: processNotification(Mocks.createMockNotificationERC20Sent()),
    hasModal: true,
  },
  {
    notification: processNotification(
      Mocks.createMockNotificationERC20Received(),
    ),
    hasModal: true,
  },
  {
    notification: processNotification(Mocks.createMockNotificationERC721Sent()),
    hasModal: true,
  },
  {
    notification: processNotification(
      Mocks.createMockNotificationERC721Received(),
    ),
    hasModal: true,
  },
  {
    notification: processNotification(
      Mocks.createMockNotificationERC1155Sent(),
    ),
    hasModal: true,
  },
  {
    notification: processNotification(
      Mocks.createMockNotificationERC1155Received(),
    ),
    hasModal: true,
  },
  {
    notification: processNotification(
      Mocks.createMockNotificationMetaMaskSwapsCompleted(),
    ),
    hasModal: true,
  },
  {
    notification: processNotification(
      Mocks.createMockNotificationRocketPoolStakeCompleted(),
    ),
    hasModal: true,
  },
  {
    notification: processNotification(
      Mocks.createMockNotificationRocketPoolUnStakeCompleted(),
    ),
    hasModal: true,
  },
  {
    notification: processNotification(
      Mocks.createMockNotificationLidoStakeCompleted(),
    ),
    hasModal: true,
  },
  {
    notification: processNotification(
      Mocks.createMockNotificationLidoWithdrawalRequested(),
    ),
    hasModal: true,
  },
  {
    notification: processNotification(
      Mocks.createMockNotificationLidoReadyToBeWithdrawn(),
    ),
    hasModal: true,
  },
  {
    notification: processNotification(
      Mocks.createMockNotificationLidoWithdrawalCompleted(),
    ),
    hasModal: true,
  },
  {
    notification: processNotification(Mocks.createMockFeatureAnnouncementRaw()),
    hasModal: true,
  },
  {
    notification: processNotification(Mocks.createMockPlatformNotification()),
    hasModal: false,
    hasCta: true,
  },
].map((x) => ({ ...x, type: x.notification.type }));

export default MOCK_NOTIFICATIONS;
