import { BaseControllerMessenger } from '../../types';
import { getNotificationServicesControllerMessenger } from './notification-services-controller-messenger';
import { ExtendedControllerMessenger } from '../../../ExtendedControllerMessenger';

describe('getNotificationServicesControllerMessenger', () => {
  const arrangeMocks = () => {
    const baseMessenger: BaseControllerMessenger =
      new ExtendedControllerMessenger();
    const mockGetRestricted = jest.spyOn(baseMessenger, 'getRestricted');
    return { baseMessenger, mockGetRestricted };
  };

  it('returns a restricted messenger with the correct configuration', () => {
    const { baseMessenger, mockGetRestricted } = arrangeMocks();

    const restrictedMessenger =
      getNotificationServicesControllerMessenger(baseMessenger);

    expect(mockGetRestricted).toHaveBeenCalledWith({
      name: 'NotificationServicesController',
      allowedActions: [
        // Keyring Actions
        'KeyringController:withKeyring',
        'KeyringController:getState',
        // Auth Actions
        'AuthenticationController:getBearerToken',
        'AuthenticationController:isSignedIn',
        'AuthenticationController:performSignIn',
        // Storage Actions
        'UserStorageController:getStorageKey',
        'UserStorageController:performGetStorage',
        'UserStorageController:performSetStorage',
        // Push Actions
        'NotificationServicesPushController:enablePushNotifications',
        'NotificationServicesPushController:disablePushNotifications',
        'NotificationServicesPushController:subscribeToPushNotifications',
        'NotificationServicesPushController:updateTriggerPushNotifications',
      ],
      allowedEvents: [
        // Keyring Events
        'KeyringController:stateChange',
        'KeyringController:lock',
        'KeyringController:unlock',
        // Push Notification Events
        'NotificationServicesPushController:onNewNotifications',
        'NotificationServicesPushController:stateChange',
      ],
    });

    expect(restrictedMessenger).toBeDefined();
  });
});
