import type { TypeFeatureAnnouncement } from './TypeFeatureAnnouncement.ts';

export type { TypeFeatureAnnouncementFields } from './TypeFeatureAnnouncement.ts';

import type { TRIGGER_TYPES } from '../../constants/triggers';

export interface FeatureAnnouncementRawNotification {
  type: TRIGGER_TYPES.FEATURES_ANNOUNCEMENT;
  createdAt: Date;
  data: TypeFeatureAnnouncement['fields'];
}
