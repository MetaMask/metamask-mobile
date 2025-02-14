import { isOfTypeNodeGuard } from './node-guard';
import {
  INotification,
  TRIGGER_TYPES,
} from '@metamask/notification-services-controller/notification-services';
import MOCK_NOTIFICATIONS from '../../../components/UI/Notification/__mocks__/mock_notifications';

describe('isOfTypeNodeGuard', () => {
  const sampleTypes = [
    TRIGGER_TYPES.ERC1155_RECEIVED,
    TRIGGER_TYPES.ERC721_RECEIVED,
  ];

  const isERC1155Or721ReceivedNotification = isOfTypeNodeGuard(sampleTypes);

  it('returns true for notifications with matching types', () => {
    const erc1155Notification: INotification = MOCK_NOTIFICATIONS[7];

    expect(isERC1155Or721ReceivedNotification(erc1155Notification)).toBe(true);
  });

  it('returns false for notifications with non-matching types', () => {
    const otherNotification: INotification = MOCK_NOTIFICATIONS[1];

    expect(isERC1155Or721ReceivedNotification(otherNotification)).toBe(false);
  });

  it('returns undefined for notifications with undefined type', () => {
    const undefinedTypeNotification: Partial<INotification> = {};

    expect(
      isERC1155Or721ReceivedNotification(
        undefinedTypeNotification as INotification,
      ),
    ).toBe(undefined);
  });

  it('narrows types correctly when used in a type guard context', () => {
    const mixedNotifications: INotification[] = [
      MOCK_NOTIFICATIONS[7],
      MOCK_NOTIFICATIONS[1],
      MOCK_NOTIFICATIONS[5],
      {} as INotification,
    ];

    const filteredNotifications = mixedNotifications.filter(
      isERC1155Or721ReceivedNotification,
    );

    expect(filteredNotifications).toHaveLength(2);
    filteredNotifications.forEach((notification) => {
      expect(sampleTypes).toContain(notification.type);
    });
  });
});
