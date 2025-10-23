import type { NotificationServicesPushControllerMessenger } from '@metamask/notification-services-controller/push-services';
import { RootExtendedMessenger } from '../../types';

export function getNotificationServicesPushControllerMessenger(
  baseControllerMessenger: RootExtendedMessenger,
): NotificationServicesPushControllerMessenger {
  return baseControllerMessenger.getRestricted({
    name: 'NotificationServicesPushController',
    allowedActions: ['AuthenticationController:getBearerToken'],
    allowedEvents: [],
  });
}
