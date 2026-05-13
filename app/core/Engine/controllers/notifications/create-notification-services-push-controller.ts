import {
  NotificationServicesPushControllerMessenger,
  NotificationServicesPushControllerState,
  defaultState,
  Controller as NotificationServicesPushController,
} from '@metamask/notification-services-controller/push-services';
import I18n from '../../../../../locales/i18n';
import Logger from '../../../../util/Logger';
import { markPushPrePromptPerformance } from '../../../../util/notifications/utils/push-pre-prompt-performance';
import { resolvePushNotificationStatus } from '../../../../util/notifications/utils/push-notification-status';
import {
  createRegToken,
  createSubscribeToPushNotifications,
  deleteRegToken,
} from './push-utils';

export const createNotificationServicesPushController = (props: {
  hasPersistedState?: boolean;
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

  markPushPrePromptPerformance('push_controller.init', {
    hasFcmToken: Boolean(notificationServicesPushController.state.fcmToken),
    hasPersistedState: Boolean(props.hasPersistedState),
    isPushEnabled: notificationServicesPushController.state.isPushEnabled,
  });

  // Push Notification Side Effect - ensure permissions have been set
  // We only need to switch push notifications off if it is enabled, but the system/device has it off
  if (notificationServicesPushController.state.isPushEnabled) {
    resolvePushNotificationStatus({
      controllerIsPushEnabled:
        notificationServicesPushController.state.isPushEnabled,
      source: 'push_controller_init',
    })
      .then(({ nativeOsPermissionEnabled }) => {
        markPushPrePromptPerformance('push_controller.os_permission_result', {
          isEnabled: nativeOsPermissionEnabled,
          persistedIsPushEnabled:
            notificationServicesPushController.state.isPushEnabled,
        });

        if (nativeOsPermissionEnabled === false) {
          markPushPrePromptPerformance(
            'push_controller.disable_due_to_os_permission.start',
          );
          notificationServicesPushController
            .disablePushNotifications()
            .then(() => {
              markPushPrePromptPerformance(
                'push_controller.disable_due_to_os_permission.end',
                {
                  isPushEnabled:
                    notificationServicesPushController.state.isPushEnabled,
                },
              );
            })
            .catch((error) => {
              markPushPrePromptPerformance(
                'push_controller.disable_due_to_os_permission.error',
                {
                  error: error instanceof Error ? error.message : String(error),
                },
              );
              Logger.error(error);
            });
        }
      })
      .catch((error) => {
        markPushPrePromptPerformance('push_controller.os_permission_error', {
          error: error instanceof Error ? error.message : String(error),
        });
        Logger.error(error);
      });
  }

  return notificationServicesPushController;
};
