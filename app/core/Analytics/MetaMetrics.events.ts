// This file holds all events that the mobile app is going to
// track if the user has the MetaMetrics option ENABLED.
// In case that the MetaMetrics option is DISABLED, then none
// of these events should be tracked in any kind of service.

import { IMetaMetricsEvent } from './MetaMetrics.types';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const generateOpt = (
  category: string,
  action?: string,
  name?: string,
): IMetaMetricsEvent => ({
  name: category,
  properties: {
    action,
    name,
  },
});

const MetaMetricsEvents = {};

export default MetaMetricsEvents;
