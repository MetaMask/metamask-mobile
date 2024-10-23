import { TRIGGER_TYPES } from '../../constants';
import type { TypeFeatureAnnouncement } from './TypeFeatureAnnouncement';

export type { TypeFeatureAnnouncementFields } from './TypeFeatureAnnouncement';

export interface FeatureAnnouncementRawNotification {
  type: TRIGGER_TYPES.FEATURES_ANNOUNCEMENT;
  createdAt: Date;
  data: TypeFeatureAnnouncement['fields'];
}
