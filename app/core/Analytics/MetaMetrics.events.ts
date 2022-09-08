// This file holds all events that the mobile app is going to
// track if the user has the MetaMetrics option ENABLED.
// In case that the MetaMetrics option is DISABLED, then none
// of these events should be tracked in any kind of service.

import { IMetaMetricsEvent } from './MetaMetrics.types';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const generateOpt = (name: string, anonymous?: boolean): IMetaMetricsEvent => ({
  name,
  anonymous: anonymous || false,
});

const MetaMetricsEvents = {};

export default MetaMetricsEvents;
