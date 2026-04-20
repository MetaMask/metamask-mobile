import type { AnalyticsExpectations } from '../../../framework';

const CARD_BUTTON_VIEWED = 'Card Button Viewed';
const CARD_HOME_CLICKED = 'Card Home Clicked';
const CARD_ADD_FUNDS_CLICKED = 'Card Add Funds Clicked';

/**
 * Expected MetaMetrics payloads after opening Card Home and tapping Add Funds.
 */
export const cardHomeAddFundsExpectations: AnalyticsExpectations = {
  eventNames: [CARD_BUTTON_VIEWED, CARD_HOME_CLICKED, CARD_ADD_FUNDS_CLICKED],
  expectedTotalCount: 3,
  events: [
    { name: CARD_BUTTON_VIEWED },
    { name: CARD_HOME_CLICKED },
    { name: CARD_ADD_FUNDS_CLICKED },
  ],
};
