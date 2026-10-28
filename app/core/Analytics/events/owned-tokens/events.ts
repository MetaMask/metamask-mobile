import {
  generateOpt,
  EVENT_NAME as METRICS_EVENT_NAME,
} from '../../MetaMetrics.events';

enum EVENT_NAME {
  OWNED_TOKENS_LIST_VIEWED = 'Owned Tokens List Viewed',
  OWNED_TOKENS_FILTER_USED = 'Owned Tokens Filter Used',
  OWNED_TOKENS_SEARCH_USED = 'Owned Tokens Search Used',
  OWNED_TOKENS_ADDED = 'Owned Tokens Added',
}

const createEvent = (name: EVENT_NAME) =>
  generateOpt(name as unknown as METRICS_EVENT_NAME);

export const OWNED_TOKENS_EVENTS = {
  LIST_VIEWED: createEvent(EVENT_NAME.OWNED_TOKENS_LIST_VIEWED),
  FILTER_USED: createEvent(EVENT_NAME.OWNED_TOKENS_FILTER_USED),
  SEARCH_USED: createEvent(EVENT_NAME.OWNED_TOKENS_SEARCH_USED),
  TOKENS_ADDED: createEvent(EVENT_NAME.OWNED_TOKENS_ADDED),
};
