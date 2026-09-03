import {
  generateOpt,
  EVENT_NAME as METRICS_EVENT_NAME,
} from '../../MetaMetrics.events';

enum EVENT_NAME {
  ACTIVITY_DETAILS_OPENED = 'Activity Details Opened',
}

const createEvent = (name: EVENT_NAME) =>
  generateOpt(name as unknown as METRICS_EVENT_NAME);

export const ACTIVITY_DETAIL_EVENTS = {
  OPENED: createEvent(EVENT_NAME.ACTIVITY_DETAILS_OPENED),
};
