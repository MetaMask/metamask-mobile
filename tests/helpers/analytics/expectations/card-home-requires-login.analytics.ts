import type { AnalyticsExpectations } from '../../../framework';

const CARD_BUTTON_VIEWED = 'Card Button Viewed';
const CARD_HOME_CLICKED = 'Card Home Clicked';

/**
 * Expected MetaMetrics payloads after a logged-out cardholder opens Card login
 * from the wallet. Card Viewed is omitted: it fires only once a provider
 * resolves, which this flow does not wait for.
 */
export const cardHomeRequiresLoginExpectations: AnalyticsExpectations = {
  eventNames: [CARD_BUTTON_VIEWED, CARD_HOME_CLICKED],
  expectedTotalCount: 2,
  events: [{ name: CARD_BUTTON_VIEWED }, { name: CARD_HOME_CLICKED }],
};
