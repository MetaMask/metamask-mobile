import {
  NotificationServicesControllerMessenger,
  NotificationServicesControllerState,
  Controller as NotificationServicesController,
} from '@metamask/notification-services-controller/notification-services';
import Logger from '../../../../util/Logger';

export const createNotificationServicesController = (props: {
  messenger: NotificationServicesControllerMessenger;
  initialState?: Partial<NotificationServicesControllerState>;
}): NotificationServicesController => {
  try {
    const notificationServicesController = new NotificationServicesController({
      messenger: props.messenger,
      state: props.initialState,
      env: {
        featureAnnouncements: {
          platform: 'mobile',
          accessToken: process.env
            .FEATURES_ANNOUNCEMENTS_ACCESS_TOKEN as string,
          spaceId: process.env.FEATURES_ANNOUNCEMENTS_SPACE_ID as string,
        },
      },
    });
    return notificationServicesController;
  } catch (err) {
    const error = new Error(
      `Failed to initialize NotificationServicesController - ${err}`,
    );
    Logger.error(error);
    throw error;
  }
};
