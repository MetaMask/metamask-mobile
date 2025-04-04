import type { NotificationServicesControllerMessenger } from '@metamask/notification-services-controller/notification-services';
import { BaseControllerMessenger } from '../../types';

export function getNotificationServicesControllerMessenger(
  baseControllerMessenger: BaseControllerMessenger,
): NotificationServicesControllerMessenger {
  return baseControllerMessenger.getRestricted({
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
}
