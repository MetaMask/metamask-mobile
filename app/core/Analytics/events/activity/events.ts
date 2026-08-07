import {
  generateOpt,
  EVENT_NAME as METRICS_EVENT_NAME,
} from '../../MetaMetrics.events';

enum EVENT_NAME {
  // Matches the name extension emits (TMCU-836). The legacy
  // 'Activity Screen Opened' name is retained in segment-schema for historical
  // validation only and is not emitted by any client.
  ACTIVITY_SCREEN_VIEWED = 'Activity Screen Viewed',
}

// This function helps prevent repeat of type conversions
const createEvent = (name: EVENT_NAME) =>
  generateOpt(name as unknown as METRICS_EVENT_NAME);

export const ACTIVITY_SCREEN_EVENTS = {
  VIEWED: createEvent(EVENT_NAME.ACTIVITY_SCREEN_VIEWED),
};
