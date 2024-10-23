import { NotificationServicesController } from '@metamask/notification-services-controller';
import type { TypeFeatureAnnouncement } from './TypeFeatureAnnouncement';

export type { TypeFeatureAnnouncementFields } from './TypeFeatureAnnouncement';

export interface FeatureAnnouncementRawNotification {
  type: NotificationServicesController.Constants.TRIGGER_TYPES.FEATURES_ANNOUNCEMENT;
  createdAt: Date;
  data: TypeFeatureAnnouncement['fields'];
}
