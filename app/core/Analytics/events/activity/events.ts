import {
  generateOpt,
  EVENT_NAME as METRICS_EVENT_NAME,
} from '../../MetaMetrics.events';

enum EVENT_NAME {
  ACTIVITY_SCREEN_VIEWED = 'Activity Screen Viewed',
}

const createEvent = (name: EVENT_NAME) =>
  generateOpt(name as unknown as METRICS_EVENT_NAME);

export const ACTIVITY_SCREEN_EVENTS = {
  VIEWED: createEvent(EVENT_NAME.ACTIVITY_SCREEN_VIEWED),
};
