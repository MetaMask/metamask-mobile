import { isOfTypeNodeGuard } from './node-guard';
import { Notification } from '../types';
import { NotificationServicesController } from '@metamask/notification-services-controller';
import MOCK_NOTIFICATIONS from '../../../components/UI/Notification/__mocks__/mock_notifications';

const { TRIGGER_TYPES } = NotificationServicesController.Constants;

describe('isOfTypeNodeGuard', () => {
  const sampleTypes = [
    TRIGGER_TYPES.ERC1155_RECEIVED,
    TRIGGER_TYPES.ERC721_RECEIVED,
  ];

  const isERC1155Or721ReceivedNotification = isOfTypeNodeGuard(sampleTypes);

  it('returns true for notifications with matching types', () => {
    const erc1155Notification: Notification = MOCK_NOTIFICATIONS[7];

    expect(isERC1155Or721ReceivedNotification(erc1155Notification)).toBe(true);
  });

  it('returns false for notifications with non-matching types', () => {
    const otherNotification: Notification = MOCK_NOTIFICATIONS[1];

    expect(isERC1155Or721ReceivedNotification(otherNotification)).toBe(false);
  });

  it('returns undefined for notifications with undefined type', () => {
    const undefinedTypeNotification: Partial<Notification> = {};

    expect(isERC1155Or721ReceivedNotification(undefinedTypeNotification as Notification)).toBe(undefined);
  });

  it('narrows types correctly when used in a type guard context', () => {
    const mixedNotifications: Notification[] = [
      MOCK_NOTIFICATIONS[7],
      MOCK_NOTIFICATIONS[1],
      MOCK_NOTIFICATIONS[5],
      {} as Notification,
    ];

    const filteredNotifications = mixedNotifications.filter(isERC1155Or721ReceivedNotification);

    expect(filteredNotifications).toHaveLength(2);
    filteredNotifications.forEach(notification => {
      expect(sampleTypes).toContain(notification.type);
    });
  });
});
