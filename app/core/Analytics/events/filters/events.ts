import {
  generateOpt,
  EVENT_NAME as METRICS_EVENT_NAME,
} from '../../MetaMetrics.events';

enum EVENT_NAME {
  FILTER_CLICKED = 'Filter Clicked',
}

// This function helps prevent repeat of type conversions
const createEvent = (name: EVENT_NAME) =>
  generateOpt(name as unknown as METRICS_EVENT_NAME);

/**
 * Generic filter-interaction event (TMCU-837). Surface-agnostic on purpose:
 * new surfaces add a `FilterLocation` / `FilterType` value instead of minting
 * another bespoke filter event.
 */
export const FILTER_EVENTS = {
  CLICKED: createEvent(EVENT_NAME.FILTER_CLICKED),
};
