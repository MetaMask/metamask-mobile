import type { AnalyticsExpectations } from '../../../framework';

const CARD_BUTTON_VIEWED = 'Card Button Viewed';
const CARD_HOME_CLICKED = 'Card Home Clicked';
const CARD_ADD_FUNDS_CLICKED = 'Card Add Funds Clicked';

/**
 * Minimum MetaMetrics checks for the Card Home smoke flow.
 * No expectedTotalCount — the full smoke continues past Add Funds and emits more events.
 */
export const cardHomeSmokeExpectations: AnalyticsExpectations = {
  eventNames: [CARD_BUTTON_VIEWED, CARD_HOME_CLICKED, CARD_ADD_FUNDS_CLICKED],
  events: [
    { name: CARD_BUTTON_VIEWED },
    { name: CARD_HOME_CLICKED },
    { name: CARD_ADD_FUNDS_CLICKED },
  ],
};
