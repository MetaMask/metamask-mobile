import {
  TRIGGER_TYPES,
  processNotification,
} from '@metamask/notification-services-controller/notification-services';
import {
  createMockNotificationEthSent,
  createMockNotificationEthReceived,
  createMockNotificationERC20Sent,
  createMockNotificationERC20Received,
} from '@metamask/notification-services-controller/notification-services/mocks';
import {
  hasNotificationComponents,
  hasNotificationModal,
  isValidNotificationComponent,
  NotificationComponentState,
} from '.';
import { mockNotificationsWithMetaData } from '../../../components/UI/Notification/__mocks__/mock_notifications';

describe('isValidNotificationComponent()', () => {
  it.each(mockNotificationsWithMetaData)(
    'returns true for all valid supported notifications - $type',
    ({ notification }) => {
      expect(isValidNotificationComponent(notification)).toBe(true);
    },
  );

  it('filters out unsupported eth_sent and eth_received notifications', () => {
    const invalidNotifications = [
      processNotification(createMockNotificationEthSent()),
      processNotification(createMockNotificationEthReceived()),
    ].map((n) => {
      if (
        n.type === TRIGGER_TYPES.ETH_SENT ||
        n.type === TRIGGER_TYPES.ETH_RECEIVED
      ) {
        n.payload.chain_id = 123; // unsupported chainId
      }

      return n;
    });

    invalidNotifications.forEach((n) => {
      expect(isValidNotificationComponent(n)).toBe(false);
    });
  });

  it('filters out unsupported erc20_sent and erc20_received notifications', () => {
    const invalidNotifications = [
      processNotification(createMockNotificationERC20Sent()),
      processNotification(createMockNotificationERC20Received()),
    ].map((n) => {
      if (
        n.type === TRIGGER_TYPES.ERC20_SENT ||
        n.type === TRIGGER_TYPES.ERC20_RECEIVED
      ) {
        n.payload.chain_id = 123; // unsupported chainId
      }

      return n;
    });

    invalidNotifications.forEach((n) => {
      expect(isValidNotificationComponent(n)).toBe(false);
    });
  });
});

describe('hasNotificationComponents()', () => {
  it.each(mockNotificationsWithMetaData)(
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
  it.each(mockNotificationsWithMetaData.filter((x) => x.hasModal))(
    'returns true for all notifications that should render a modal details screen - $type',
    ({ type }) => {
      expect(hasNotificationModal(type)).toBe(true);
    },
  );

  it.each(mockNotificationsWithMetaData.filter((x) => !x.hasModal))(
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
  it.each(mockNotificationsWithMetaData)(
    'computes notification component state for each notification type - $type',
    ({ notification, hasModal }) => {
      if (!hasNotificationComponents(notification.type)) {
        throw new Error('UNSUPPORTED NOTIFICATION');
      }

      const notificationState = NotificationComponentState[notification.type];
      expect(notificationState.createMenuItem(notification)).toStrictEqual(
        expect.objectContaining({
          title: expect.any(String),
          description: expect.objectContaining({
            start: expect.any(String),
          }),
          createdAt: expect.any(String),
        }),
      );

      expect(
        notificationState.createModalDetails?.(notification),
      ).toStrictEqual(
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
