import { TRIGGER_TYPES } from '@metamask/notification-services-controller/notification-services';
import {
  hasNotificationComponents,
  hasNotificationModal,
  NotificationComponentState,
} from '.';
import { mockNotificationsWithMetaData } from '../../../components/UI/Notification/__mocks__/mock_notifications';

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
