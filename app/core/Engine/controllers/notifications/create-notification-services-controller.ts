import { getVersion } from 'react-native-device-info';
import {
  NotificationServicesControllerMessenger,
  NotificationServicesControllerState,
  Controller as NotificationServicesController,
} from '@metamask/notification-services-controller/notification-services';
import I18n from '../../../../../locales/i18n';
import { devApiEnv } from '../../../devApiEnv';

// Maps mobile's `devApiEnv` ('prod') onto the notification SDK's `ENV` ('prd').
const NOTIFICATION_ENV_BY_DEV_API_ENV: Record<
  ReturnType<typeof devApiEnv>,
  'dev' | 'uat' | 'prd'
> = { dev: 'dev', uat: 'uat', prod: 'prd' };

export const createNotificationServicesController = (props: {
  messenger: NotificationServicesControllerMessenger;
  initialState?: Partial<NotificationServicesControllerState>;
}): NotificationServicesController => {
  const notificationServicesController = new NotificationServicesController({
    messenger: props.messenger,
    state: props.initialState,
    env: {
      featureAnnouncements: {
        platform: 'mobile',
        accessToken: process.env.FEATURES_ANNOUNCEMENTS_ACCESS_TOKEN ?? '',
        spaceId: process.env.FEATURES_ANNOUNCEMENTS_SPACE_ID ?? '',
        platformVersion: getVersion(),
      },
      locale: () => I18n.locale,
      env: NOTIFICATION_ENV_BY_DEV_API_ENV[devApiEnv()],
    },
  });
  return notificationServicesController;
};
