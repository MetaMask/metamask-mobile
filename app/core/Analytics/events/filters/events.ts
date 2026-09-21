import {
  generateOpt,
  EVENT_NAME as METRICS_EVENT_NAME,
} from '../../MetaMetrics.events';

enum EVENT_NAME {
  FILTER_CLICKED = 'Filter Clicked',
}

const createEvent = (name: EVENT_NAME) =>
  generateOpt(name as unknown as METRICS_EVENT_NAME);

export const FILTER_EVENTS = {
  CLICKED: createEvent(EVENT_NAME.FILTER_CLICKED),
};
