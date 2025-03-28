import type { NotificationServicesControllerMessenger } from '@metamask/notification-services-controller/notification-services';
import { BaseControllerMessenger } from '../../types';

export function getNotificationServicesControllerMessenger(
  baseControllerMessenger: BaseControllerMessenger,
): NotificationServicesControllerMessenger {
  return baseControllerMessenger.getRestricted({
    name: 'NotificationServicesController',
    allowedActions: [
      // Keyring Controller Requests
      'KeyringController:withKeyring',
      'KeyringController:getState',
      'KeyringController:getAccounts',
      // Auth Controller Requests
      'AuthenticationController:getBearerToken',
      'AuthenticationController:isSignedIn',
      'AuthenticationController:performSignIn',
      // User Storage Controller Requests
      'UserStorageController:getStorageKey',
      'UserStorageController:performGetStorage',
      'UserStorageController:performSetStorage',
      // Push Notification Controller Requests
      'NotificationServicesPushController:enablePushNotifications',
      'NotificationServicesPushController:disablePushNotifications',
      'NotificationServicesPushController:updateTriggerPushNotifications',
      'NotificationServicesPushController:subscribeToPushNotifications',
    ],
    allowedEvents: [
      // Keyring Controller Events
      'KeyringController:stateChange',
      'KeyringController:lock',
      'KeyringController:unlock',
      // Push Notification Controller Events
      'NotificationServicesPushController:onNewNotifications',
      'NotificationServicesPushController:stateChange',
    ],
  });
}
