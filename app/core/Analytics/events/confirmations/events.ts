import {
  generateOpt,
  EVENT_NAME as METRICS_EVENT_NAME,
} from '../../MetaMetrics.events';

enum EVENT_NAME {
  ADVANCED_DETAILS_CLICKED = 'Confirmation Advanced Details Clicked',
  TOOLTIP_CLICKED = 'Confirmation Tooltip Clicked',
  SCREEN_VIEWED = 'Confirmation Screen Viewed',
}

// This function helps prevent repeat of type conversions
const createEvent = (name: EVENT_NAME) =>
  generateOpt(name as unknown as METRICS_EVENT_NAME);

export const CONFIRMATION_EVENTS = {
  ADVANCED_DETAILS_CLICKED: createEvent(EVENT_NAME.ADVANCED_DETAILS_CLICKED),
  SCREEN_VIEWED: createEvent(EVENT_NAME.SCREEN_VIEWED),
  TOOLTIP_CLICKED: createEvent(EVENT_NAME.TOOLTIP_CLICKED),
};
