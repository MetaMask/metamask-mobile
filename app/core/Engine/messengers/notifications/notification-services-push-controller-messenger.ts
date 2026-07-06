import type { NotificationServicesPushControllerMessenger } from '@metamask/notification-services-controller/push-services';
import { RootMessenger } from '../../types';
import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';

export function getNotificationServicesPushControllerMessenger(
  rootMessenger: RootMessenger<
    MessengerActions<NotificationServicesPushControllerMessenger>,
    MessengerEvents<NotificationServicesPushControllerMessenger>
  >,
): NotificationServicesPushControllerMessenger {
  const messenger: NotificationServicesPushControllerMessenger = new Messenger({
    namespace: 'NotificationServicesPushController',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: ['AuthenticationController:getBearerToken'],
    events: [],
    messenger,
  });
  return messenger;
}
