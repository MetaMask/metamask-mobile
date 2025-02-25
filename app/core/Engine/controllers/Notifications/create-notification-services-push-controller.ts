import {
  NotificationServicesPushControllerMessenger,
  NotificationServicesPushControllerState,
  defaultState,
  Controller as NotificationServicesPushController,
} from '@metamask/notification-services-controller/push-services';
import Logger from '../../../../util/Logger';
import {
  createRegToken,
  createSubscribeToPushNotifications,
  deleteRegToken,
  isPushNotificationsEnabled,
} from './push-utils';
import { isNotificationsFeatureEnabled } from '../../../../util/notifications';

export const createNotificationServicesPushController = (props: {
  messenger: NotificationServicesPushControllerMessenger;
  initialState?: Partial<NotificationServicesPushControllerState>;
}) => {
  try {
    const notificationServicesPushController =
      new NotificationServicesPushController({
        messenger: props.messenger,
        state: { ...defaultState, ...props.initialState },
        config: {
          platform: 'mobile',
          isPushFeatureEnabled: isNotificationsFeatureEnabled(),
          pushService: {
            createRegToken,
            deleteRegToken,
            subscribeToPushNotifications: createSubscribeToPushNotifications(),
          },
        },
      });

    // Push Notification Side Effect - ensure permissions have been set
    // We only need to switch push notifications off if it is enabled, but the system/device has it off
    if (notificationServicesPushController.state.isPushEnabled) {
      isPushNotificationsEnabled().then((isEnabled) => {
        if (isEnabled === false) {
          notificationServicesPushController
            .disablePushNotifications()
            .catch(() => {
              /* Do Nothing */
            });
        }
      });
    }

    return notificationServicesPushController;
  } catch (error) {
    Logger.error(
      error as Error,
      'Failed to initialize NotificationServicesController',
    );
    throw error;
  }
};
