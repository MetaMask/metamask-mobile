import {
  generateOpt,
  EVENT_NAME as METRICS_EVENT_NAME,
} from '../../MetaMetrics.events';

enum EVENT_NAME {
  // Renamed from 'Transaction Detail List Item Clicked' (TMCU-835) to match the
  // name extension already emits, so both platforms share one funnel.
  ACTIVITY_DETAILS_OPENED = 'Activity Details Opened',
}

// This function helps prevent repeat of type conversions
const createEvent = (name: EVENT_NAME) =>
  generateOpt(name as unknown as METRICS_EVENT_NAME);

export const ACTIVITY_DETAIL_EVENTS = {
  OPENED: createEvent(EVENT_NAME.ACTIVITY_DETAILS_OPENED),
};
