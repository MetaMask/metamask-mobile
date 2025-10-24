import type { NotificationServicesControllerMessenger } from '@metamask/notification-services-controller/notification-services';
import { RootExtendedMessenger, RootMessenger } from '../../types';
import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';

export function getNotificationServicesControllerMessenger(
  baseControllerMessenger: RootExtendedMessenger,
): NotificationServicesControllerMessenger {
  const messenger = new Messenger<
    'NotificationServicesController',
    MessengerActions<NotificationServicesControllerMessenger>,
    MessengerEvents<NotificationServicesControllerMessenger>,
    RootMessenger
  >({
    namespace: 'NotificationServicesController',
    parent: baseControllerMessenger,
  });
  baseControllerMessenger.delegate({
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
    messenger,
  });
  return messenger;
}
