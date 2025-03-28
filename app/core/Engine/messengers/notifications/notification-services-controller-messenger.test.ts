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
        'KeyringController:withKeyring',
        'KeyringController:getState',
        'KeyringController:getAccounts',
        'AuthenticationController:getBearerToken',
        'AuthenticationController:isSignedIn',
        'AuthenticationController:performSignIn',
        'UserStorageController:getStorageKey',
        'UserStorageController:performGetStorage',
        'UserStorageController:performSetStorage',
        'NotificationServicesPushController:enablePushNotifications',
        'NotificationServicesPushController:disablePushNotifications',
        'NotificationServicesPushController:updateTriggerPushNotifications',
        'NotificationServicesPushController:subscribeToPushNotifications',
      ],
      allowedEvents: [
        'KeyringController:stateChange',
        'KeyringController:lock',
        'KeyringController:unlock',
        'NotificationServicesPushController:onNewNotifications',
        'NotificationServicesPushController:stateChange',
      ],
    });

    expect(restrictedMessenger).toBeDefined();
  });
});
