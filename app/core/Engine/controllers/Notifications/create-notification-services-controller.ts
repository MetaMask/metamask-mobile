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
  } catch (error) {
    Logger.error(
      error as Error,
      'Failed to initialize NotificationServicesController',
    );
    throw error;
  }
};
