import {
  NotificationServicesPushControllerMessenger,
  NotificationServicesPushControllerState,
  defaultState,
  Controller as NotificationServicesPushController,
} from '@metamask/notification-services-controller/push-services';
import I18n from '../../../../../locales/i18n';
import Logger from '../../../../util/Logger';
import { resolvePushNotificationStatus } from '../../../../util/notifications/utils/push-notification-status';
import {
  createRegToken,
  createSubscribeToPushNotifications,
  deleteRegToken,
} from './push-utils';

export const createNotificationServicesPushController = (props: {
  messenger: NotificationServicesPushControllerMessenger;
  initialState?: Partial<NotificationServicesPushControllerState>;
}) => {
  const notificationServicesPushController =
    new NotificationServicesPushController({
      messenger: props.messenger,
      state: { ...defaultState, ...props.initialState },
      config: {
        platform: 'mobile',
        isPushFeatureEnabled: true,
        pushService: {
          createRegToken,
          deleteRegToken,
          subscribeToPushNotifications: createSubscribeToPushNotifications(),
        },
        getLocale: () => I18n.locale,
      },
    });

  // Push Notification Side Effect - ensure permissions have been set
  // We only need to switch push notifications off if it is enabled, but the system/device has it off
  if (notificationServicesPushController.state.isPushEnabled) {
    resolvePushNotificationStatus({
      controllerIsPushEnabled:
        notificationServicesPushController.state.isPushEnabled,
    })
      .then(({ nativeOsPermissionEnabled }) => {
        if (nativeOsPermissionEnabled === false) {
          notificationServicesPushController
            .disablePushNotifications()
            .catch((error) => {
              Logger.error(error);
            });
        }
      })
      .catch((error) => {
        Logger.error(error);
      });
  }

  return notificationServicesPushController;
};
