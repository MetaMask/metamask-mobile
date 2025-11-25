import {
  TRIGGER_TYPES,
  processNotification,
} from '@metamask/notification-services-controller/notification-services';
import {
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
  createMockPlatformNotification,
  createMockFeatureAnnouncementRaw,
} from '@metamask/notification-services-controller/notification-services/mocks';
import {
  hasNotificationComponents,
  hasNotificationModal,
  NotificationComponentState,
} from '.';

const mockAllNotifications = [
  { n: processNotification(createMockNotificationEthSent()), hasModal: true },
  {
    n: processNotification(createMockNotificationEthReceived()),
    hasModal: true,
  },
  { n: processNotification(createMockNotificationERC20Sent()), hasModal: true },
  {
    n: processNotification(createMockNotificationERC20Received()),
    hasModal: true,
  },
  {
    n: processNotification(createMockNotificationERC721Sent()),
    hasModal: true,
  },
  {
    n: processNotification(createMockNotificationERC721Received()),
    hasModal: true,
  },
  {
    n: processNotification(createMockNotificationERC1155Sent()),
    hasModal: true,
  },
  {
    n: processNotification(createMockNotificationERC1155Received()),
    hasModal: true,
  },
  {
    n: processNotification(createMockNotificationMetaMaskSwapsCompleted()),
    hasModal: true,
  },
  {
    n: processNotification(createMockNotificationRocketPoolStakeCompleted()),
    hasModal: true,
  },
  {
    n: processNotification(createMockNotificationRocketPoolUnStakeCompleted()),
    hasModal: true,
  },
  {
    n: processNotification(createMockNotificationLidoStakeCompleted()),
    hasModal: true,
  },
  {
    n: processNotification(createMockNotificationLidoWithdrawalRequested()),
    hasModal: true,
  },
  {
    n: processNotification(createMockNotificationLidoReadyToBeWithdrawn()),
    hasModal: true,
  },
  {
    n: processNotification(createMockNotificationLidoWithdrawalCompleted()),
    hasModal: true,
  },
  {
    n: processNotification(createMockFeatureAnnouncementRaw()),
    hasModal: true,
  },
  { n: processNotification(createMockPlatformNotification()), hasModal: false },
].map((x) => ({ ...x, type: x.n.type }));

describe('hasNotificationComponents()', () => {
  it.each(mockAllNotifications)(
    'returns true for all supported notifications - $type',
    ({ type }) => {
      expect(hasNotificationComponents(type)).toBe(true);
    },
  );

  it('returns false for unsupported notification types', () => {
    expect(hasNotificationComponents('UNKNOWN_TRIGGER' as TRIGGER_TYPES)).toBe(
      false,
    );
  });
});

describe('hasNotificationModal()', () => {
  it.each(mockAllNotifications.filter((x) => x.hasModal))(
    'returns true for all notifications that should render a modal details screen - $type',
    ({ type }) => {
      expect(hasNotificationModal(type)).toBe(true);
    },
  );

  it.each(mockAllNotifications.filter((x) => !x.hasModal))(
    'returns false for all notifications that should not render a modal details screen - $type',
    ({ type }) => {
      expect(hasNotificationModal(type)).toBe(false);
    },
  );

  it('returns false for unsupported notification types', () => {
    expect(hasNotificationModal('UNKNOWN_TRIGGER' as TRIGGER_TYPES)).toBe(
      false,
    );
  });
});

describe('NotificationComponentState', () => {
  it.each(mockAllNotifications)(
    'computes notification component state for each notification type - $type',
    ({ n, hasModal }) => {
      if (!hasNotificationComponents(n.type)) {
        throw new Error('UNSUPPORTED NOTIFICATION');
      }

      const notificationState = NotificationComponentState[n.type];
      expect(notificationState.createMenuItem(n)).toStrictEqual(
        expect.objectContaining({
          title: expect.any(String),
          description: expect.objectContaining({
            start: expect.any(String),
          }),
          createdAt: expect.any(String),
        }),
      );

      expect(notificationState.createModalDetails?.(n)).toStrictEqual(
        !hasModal
          ? undefined
          : expect.objectContaining({
              title: expect.any(String),
              createdAt: expect.any(String),
              fields: expect.any(Array),
            }),
      );
    },
  );
});
