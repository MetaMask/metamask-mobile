import {
  generateOpt,
  EVENT_NAME as METRICS_EVENT_NAME,
} from '../../MetaMetrics.events';

enum EVENT_NAME {
  TRANSACTION_DETAIL_LIST_ITEM_CLICKED = 'Transaction Detail List Item Clicked',
}

// This function helps prevent repeat of type conversions
const createEvent = (name: EVENT_NAME) =>
  generateOpt(name as unknown as METRICS_EVENT_NAME);

export const TRANSACTION_DETAIL_EVENTS = {
  LIST_ITEM_CLICKED: createEvent(
    EVENT_NAME.TRANSACTION_DETAIL_LIST_ITEM_CLICKED,
  ),
};
