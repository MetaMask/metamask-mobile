import {
  generateOpt,
  EVENT_NAME as METRICS_EVENT_NAME,
} from '../../MetaMetrics.events';

enum EVENT_NAME {
  ADVANCED_DETAILS_CLICKED = 'Confirmation Advanced Details Clicked',
  TOOLTIP_CLICKED = 'Confirmation Tooltip Clicked',
  SCREEN_VIEWED = 'Confirmation Screen Viewed',
}

enum TRANSACTION_EVENT_NAMES {
  TRANSACTION_ADDED = 'Transaction Added',
  TRANSACTION_APPROVED = 'Transaction Approved',
  // Finalized is the unified event that is triggered
  // when the transaction is confirmed, dropped or failed
  TRANSACTION_FINALIZED = 'Transaction Finalized',
  TRANSACTION_REJECTED = 'Transaction Rejected',
  TRANSACTION_SUBMITTED = 'Transaction Submitted',
}

// This function helps prevent repeat of type conversions
const createEvent = (name: EVENT_NAME | TRANSACTION_EVENT_NAMES) =>
  generateOpt(name as unknown as METRICS_EVENT_NAME);

export const CONFIRMATION_EVENTS = {
  ADVANCED_DETAILS_CLICKED: createEvent(EVENT_NAME.ADVANCED_DETAILS_CLICKED),
  SCREEN_VIEWED: createEvent(EVENT_NAME.SCREEN_VIEWED),
  TOOLTIP_CLICKED: createEvent(EVENT_NAME.TOOLTIP_CLICKED),
};

export const TRANSACTION_EVENTS = {
  TRANSACTION_ADDED: createEvent(TRANSACTION_EVENT_NAMES.TRANSACTION_ADDED),
  TRANSACTION_APPROVED: createEvent(
    TRANSACTION_EVENT_NAMES.TRANSACTION_APPROVED,
  ),
  TRANSACTION_FINALIZED: createEvent(
    TRANSACTION_EVENT_NAMES.TRANSACTION_FINALIZED,
  ),
  TRANSACTION_REJECTED: createEvent(
    TRANSACTION_EVENT_NAMES.TRANSACTION_REJECTED,
  ),
  TRANSACTION_SUBMITTED: createEvent(
    TRANSACTION_EVENT_NAMES.TRANSACTION_SUBMITTED,
  ),
};
