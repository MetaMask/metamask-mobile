import NotificationsService from '../../../../util/notifications/services/NotificationService';
import FCMService from '../../../../util/notifications/services/FCMService';
import { createSubscribeToPushNotifications } from './push-utils';
import { processNotification } from '@metamask/notification-services-controller/notification-services';
import { createMockNotificationEthSent } from '@metamask/notification-services-controller/notification-services/mocks';
import type { NotificationServicesPushControllerMessenger } from '@metamask/notification-services-controller/push-services';

describe('push-utils - createSubscribeToPushNotifications tests', () => {
  const arrange = () => {
    const mockListenToPushNotificationsReceived = jest.spyOn(
      FCMService,
      'listenToPushNotificationsReceived',
    );
    const mockDisplayNotification = jest.spyOn(
      NotificationsService,
      'displayNotification',
    );
    const mockMessenger = {
      publish: jest.fn(),
    } as unknown as NotificationServicesPushControllerMessenger;
    return {
      mockListenToPushNotificationsReceived,
      mockDisplayNotification,
      mockMessenger,
    };
  };

  it('subscribes to push listener', async () => {
    // Arrange
    const mocks = arrange();
    const subscribeFn = createSubscribeToPushNotifications(mocks.mockMessenger);

    // Act
    subscribeFn();

    // Assert
    expect(mocks.mockListenToPushNotificationsReceived).toHaveBeenCalled();
  });

  it('invokes subscription handler', async () => {
    // Arrange
    const mocks = arrange();
    const subscribeFn = createSubscribeToPushNotifications(mocks.mockMessenger);
    const mockNotification = processNotification(
      createMockNotificationEthSent(),
    );

    // Act
    subscribeFn();
    const handler =
      mocks.mockListenToPushNotificationsReceived.mock.lastCall?.[0];
    handler?.(mockNotification);

    // Assert
    expect(mocks.mockMessenger.publish).toHaveBeenCalledWith(
      'NotificationServicesPushController:onNewNotifications',
      mockNotification,
    );
    expect(mocks.mockDisplayNotification).toHaveBeenCalled();
  });
});
