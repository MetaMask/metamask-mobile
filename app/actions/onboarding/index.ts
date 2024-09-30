import { IMetaMetricsEvent } from '../../core/Analytics';

export const SAVE_EVENT = 'SAVE_EVENT';
export const CLEAR_EVENTS = 'CLEAR_EVENTS';

interface SaveEventAction {
  type: typeof SAVE_EVENT;
  event: [IMetaMetricsEvent];
}

interface ClearEventsAction {
  type: typeof CLEAR_EVENTS;
}

export type OnboardingActionTypes = SaveEventAction | ClearEventsAction;

export function saveOnboardingEvent(eventArgs: [IMetaMetricsEvent]): SaveEventAction {
  console.log("THE ACTION EVENT::::::::::::::::", eventArgs)
  return {
    type: SAVE_EVENT,
    event: eventArgs,
  };
}

export function clearOnboardingEvents(): ClearEventsAction {
  return {
    type: CLEAR_EVENTS,
  };
}