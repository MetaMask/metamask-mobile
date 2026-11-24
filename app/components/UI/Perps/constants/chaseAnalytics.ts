import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
} from '@metamask/perps-controller/constants';

export const CHASE_METAMETRICS_INTERACTION = {
  CONCURRENCY_LIMIT_HIT:
    PERPS_EVENT_VALUE.INTERACTION_TYPE.CHASE_CONCURRENCY_LIMIT_HIT,
  MAX_DISTANCE_HIT: PERPS_EVENT_VALUE.INTERACTION_TYPE.CHASE_MAX_DISTANCE_HIT,
  REPRICE: PERPS_EVENT_VALUE.INTERACTION_TYPE.CHASE_REPRICE,
} as const;

export const CHASE_METAMETRICS_PROPERTY = {
  FILL_PCT_AT_TERMINATE: PERPS_EVENT_PROPERTY.FILL_PCT_AT_TERMINATE,
} as const;

export const CHASE_REPRICE_SAMPLE_INTERVAL = 10;
export const CHASE_METAMETRICS_MAX_REPORTED_KEYS = 100;

export const addBoundedChaseAnalyticsKey = (keys: Set<string>, key: string) => {
  keys.add(key);
  while (keys.size > CHASE_METAMETRICS_MAX_REPORTED_KEYS) {
    const oldestKey = keys.values().next().value;
    if (oldestKey === undefined) break;
    keys.delete(oldestKey);
  }
};
