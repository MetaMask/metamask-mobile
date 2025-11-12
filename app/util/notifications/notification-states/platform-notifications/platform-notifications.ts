import { TRIGGER_TYPES } from '@metamask/notification-services-controller/notification-services';
import { ExtractedNotification, isOfTypeNodeGuard } from '../node-guard';
import { NotificationState } from '../types/NotificationState';

type PlatformNotification = ExtractedNotification<TRIGGER_TYPES.PLATFORM>;

const isPlatformNotification = isOfTypeNodeGuard([TRIGGER_TYPES.PLATFORM]);

const state: NotificationState<PlatformNotification> = {
  guardFn: isPlatformNotification,
  createMenuItem: (notification) => ({
    title: notification.template.title,
    description: {
      start: notification.template.body,
    },
    image: {
      url: notification.template.image_url,
    },
    createdAt: notification.createdAt.toString(),
    cta: notification.template.cta,
  }),
};

export default state;
