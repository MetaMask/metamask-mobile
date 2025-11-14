import { RootExtendedMessenger } from '../../types';
import { getNotificationServicesControllerMessenger } from './notification-services-controller-messenger';
import { ExtendedMessenger } from '../../../ExtendedMessenger';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

describe('getNotificationServicesControllerMessenger', () => {
  const arrangeMocks = () => {
    const baseMessenger: RootExtendedMessenger =
      new ExtendedMessenger<MockAnyNamespace>({
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
        'NotificationServicesPushController:enablePushNotifications',
        'NotificationServicesPushController:disablePushNotifications',
        'NotificationServicesPushController:subscribeToPushNotifications',
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
