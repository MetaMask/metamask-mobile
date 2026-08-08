import {
  NotificationServicesPushControllerMessenger,
  NotificationServicesPushControllerState,
  defaultState,
  Controller as NotificationServicesPushController,
} from '@metamask/notification-services-controller/push-services';
import { getVersion } from 'react-native-device-info';
import { Platform } from 'react-native';
import I18n from '../../../../../locales/i18n';
import Logger from '../../../../util/Logger';
import { resolvePushNotificationStatus } from '../../../../util/notifications/utils/push-notification-status';
import {
  createRegToken,
  createSubscribeToPushNotifications,
  deleteRegToken,
} from './push-utils';

type MobileOperatingSystem = 'android' | 'ios';

const APP_VERSION_REGEX = /^\d+\.\d+(?:\.\d+)?$/u;

const getMobileOperatingSystem = (): MobileOperatingSystem | undefined => {
  if (Platform.OS === 'android' || Platform.OS === 'ios') {
    return Platform.OS;
  }

  return undefined;
};

const getAppVersionForRegistration = (): string | undefined => {
  let appVersion: string;

  try {
    appVersion = getVersion();
  } catch {
    return undefined;
  }

  return APP_VERSION_REGEX.test(appVersion) ? appVersion : undefined;
};

export const createNotificationServicesPushController = (props: {
  messenger: NotificationServicesPushControllerMessenger;
  initialState?: Partial<NotificationServicesPushControllerState>;
}) => {
  const os = getMobileOperatingSystem();
  const appVersion = getAppVersionForRegistration();
  const pushControllerConfig = {
    platform: 'mobile' as const,
    isPushFeatureEnabled: true,
    pushService: {
      createRegToken,
      deleteRegToken,
      subscribeToPushNotifications: createSubscribeToPushNotifications(),
    },
    getLocale: () => I18n.locale,
    ...(os ? { os } : {}),
    ...(appVersion ? { appVersion } : {}),
  };

  const notificationServicesPushController =
    new NotificationServicesPushController({
      messenger: props.messenger,
      state: { ...defaultState, ...props.initialState },
      config: pushControllerConfig,
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
