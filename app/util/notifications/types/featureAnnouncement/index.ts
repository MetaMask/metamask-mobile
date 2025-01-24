import type { TypeFeatureAnnouncement } from './TypeFeatureAnnouncement';

export type { TypeFeatureAnnouncementFields } from './TypeFeatureAnnouncement';

import type { TRIGGER_TYPES } from '../../constants/triggers';

export interface FeatureAnnouncementRawNotification {
  type: TRIGGER_TYPES.FEATURES_ANNOUNCEMENT;
  createdAt: Date;
  data: TypeFeatureAnnouncement['fields'];
}
