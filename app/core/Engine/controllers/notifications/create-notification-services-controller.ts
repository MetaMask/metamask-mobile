import { getVersion } from 'react-native-device-info';
import {
  NotificationServicesControllerMessenger,
  NotificationServicesControllerState,
  Controller as NotificationServicesController,
} from '@metamask/notification-services-controller/notification-services';
import I18n from '../../../../../locales/i18n';

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
    },
  });
  return notificationServicesController;
};
