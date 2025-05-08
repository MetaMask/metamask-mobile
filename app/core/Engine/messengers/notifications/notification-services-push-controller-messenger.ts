import type { NotificationServicesPushControllerMessenger } from '@metamask/notification-services-controller/push-services';
import { BaseControllerMessenger } from '../../types';

export function getNotificationServicesPushControllerMessenger(
  baseControllerMessenger: BaseControllerMessenger,
): NotificationServicesPushControllerMessenger {
  return baseControllerMessenger.getRestricted({
    name: 'NotificationServicesPushController',
    allowedActions: ['AuthenticationController:getBearerToken'],
    allowedEvents: [],
  });
}
