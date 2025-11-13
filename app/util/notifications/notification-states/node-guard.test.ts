import { isOfTypeNodeGuard } from './node-guard';
import {
  INotification,
  TRIGGER_TYPES,
  processNotification,
} from '@metamask/notification-services-controller/notification-services';
import {
  createMockNotificationERC1155Received,
  createMockNotificationERC721Received,
  createMockNotificationEthReceived,
} from '@metamask/notification-services-controller/notification-services/mocks';

describe('isOfTypeNodeGuard', () => {
  const erc1155Notification = processNotification(
    createMockNotificationERC1155Received(),
  );
  const erc721Notification = processNotification(
    createMockNotificationERC721Received(),
  );
  const otherNotification = processNotification(
    createMockNotificationEthReceived(),
  );

  const sampleTypes = [
    TRIGGER_TYPES.ERC1155_RECEIVED,
    TRIGGER_TYPES.ERC721_RECEIVED,
  ];
  const isERC1155Or721ReceivedNotification = isOfTypeNodeGuard(sampleTypes);

  it('returns true for notifications with matching types', () => {
    expect(isERC1155Or721ReceivedNotification(erc1155Notification)).toBe(true);
  });

  it('returns false for notifications with non-matching types', () => {
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
      erc1155Notification,
      erc721Notification,
      otherNotification,
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
