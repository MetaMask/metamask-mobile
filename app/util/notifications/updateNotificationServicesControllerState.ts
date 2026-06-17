import type { NotificationServicesControllerState } from '@metamask/notification-services-controller/notification-services';
import Engine from '../../core/Engine';

interface NotificationServicesControllerWithUpdate {
  update: (
    callback: (state: NotificationServicesControllerState) => void,
  ) => void;
}

export const updateNotificationServicesControllerState = (
  callback: (state: NotificationServicesControllerState) => void,
): void => {
  (
    Engine.context
      .NotificationServicesController as unknown as NotificationServicesControllerWithUpdate
  ).update(callback);
};
