import type { NotificationServicesPushControllerMessenger } from '@metamask/notification-services-controller/push-services';
import { RootExtendedMessenger, RootMessenger } from '../../types';
import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';

export function getNotificationServicesPushControllerMessenger(
  baseControllerMessenger: RootExtendedMessenger,
): NotificationServicesPushControllerMessenger {
  const messenger = new Messenger<
    'NotificationServicesPushController',
    MessengerActions<NotificationServicesPushControllerMessenger>,
    MessengerEvents<NotificationServicesPushControllerMessenger>,
    RootMessenger
  >({
    namespace: 'NotificationServicesPushController',
    parent: baseControllerMessenger,
  });
  baseControllerMessenger.delegate({
    actions: ['AuthenticationController:getBearerToken'],
    events: [],
    messenger,
  });
  return messenger;
}
