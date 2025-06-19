import {
  generateOpt,
  EVENT_NAME as METRICS_EVENT_NAME,
} from '../../../core/Analytics/MetaMetrics.events';

// Feature-specific event names (match EVENT_NAME style: SCREAMING_SNAKE_CASE keys, Initial Case string values with spaces)
export enum EVENT_NAME {
  COUNTER_INCREMENTED = 'Sample Counter Incremented',
  PETNAME_ADDED = 'Sample PetName Added',
  PETNAME_UPDATED = 'Sample PetName Updated',
  PETNAME_VALIDATION_FAILED = 'Sample PetName Validation Failed',
}

// Helper to create events (type-casting to global event name type if needed)
const createEvent = (name: EVENT_NAME) =>
  generateOpt(name as unknown as METRICS_EVENT_NAME);

// Export your events for use in the feature
export const SAMPLE_FEATURE_EVENTS = {
  COUNTER_INCREMENTED: createEvent(EVENT_NAME.COUNTER_INCREMENTED),
  PETNAME_ADDED: createEvent(EVENT_NAME.PETNAME_ADDED),
  PETNAME_UPDATED: createEvent(EVENT_NAME.PETNAME_UPDATED),
  PETNAME_VALIDATION_FAILED: createEvent(EVENT_NAME.PETNAME_VALIDATION_FAILED),
};
