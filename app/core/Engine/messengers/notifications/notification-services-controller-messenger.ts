import type { NotificationServicesControllerMessenger } from '@metamask/notification-services-controller/notification-services';
import { RootMessenger } from '../../types';
import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';

export function getNotificationServicesControllerMessenger(
  rootMessenger: RootMessenger<
    MessengerActions<NotificationServicesControllerMessenger>,
    MessengerEvents<NotificationServicesControllerMessenger>
  >,
): NotificationServicesControllerMessenger {
  const messenger: NotificationServicesControllerMessenger = new Messenger({
    namespace: 'NotificationServicesController',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
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
    messenger,
  });
  return messenger;
}
