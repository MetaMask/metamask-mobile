import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import type { NotificationServicesControllerMessenger } from '@metamask/notification-services-controller/notification-services';
import { getNotificationServicesControllerMessenger } from './notification-services-controller-messenger';

type RootMessenger = Messenger<
  MockAnyNamespace,
  MessengerActions<NotificationServicesControllerMessenger>,
  MessengerEvents<NotificationServicesControllerMessenger>
>;

describe('getNotificationServicesControllerMessenger', () => {
  const arrangeMocks = () => {
    const baseMessenger: RootMessenger = new Messenger<
      MockAnyNamespace,
      never,
      never
    >({
      namespace: MOCK_ANY_NAMESPACE,
    });
    const mockDelegate = jest.spyOn(baseMessenger, 'delegate');
    return { baseMessenger, mockDelegate };
  };

  it('returns a delegated messenger with the correct configuration', () => {
    const { baseMessenger, mockDelegate } = arrangeMocks();

    const delegatedMessenger =
      getNotificationServicesControllerMessenger(baseMessenger);

    expect(mockDelegate).toHaveBeenCalledWith({
      actions: [
        // Keyring Actions
        'KeyringController:getState',
        // Auth Actions
        'AuthenticationController:getBearerToken',
        'AuthenticationController:isSignedIn',
        'AuthenticationController:performSignIn',
        // Push Actions
        'NotificationServicesPushController:addPushNotificationLinks',
        'NotificationServicesPushController:enablePushNotifications',
        'NotificationServicesPushController:disablePushNotifications',
        'NotificationServicesPushController:deletePushNotificationLinks',
        'NotificationServicesPushController:subscribeToPushNotifications',
        // Authenticated user storage (notification preferences, etc.)
        'AuthenticatedUserStorageService:getNotificationPreferences',
        'AuthenticatedUserStorageService:putNotificationPreferences',
      ],
      events: [
        // Keyring Events
        'KeyringController:stateChange',
        'KeyringController:lock',
        'KeyringController:unlock',
        // Push Notification Events
        'NotificationServicesPushController:onNewNotifications',
        'NotificationServicesPushController:stateChange',
      ],
      messenger: delegatedMessenger,
    });

    expect(delegatedMessenger).toBeDefined();
  });
});
