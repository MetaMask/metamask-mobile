import type { AnalyticsExpectations } from '../../../framework';

const CARD_BUTTON_VIEWED = 'Card Button Viewed';
const CARD_HOME_CLICKED = 'Card Home Clicked';

/**
 * Expected MetaMetrics payloads after opening Card Home via navbar button.
 */
export const cardButtonExpectations: AnalyticsExpectations = {
  eventNames: [CARD_BUTTON_VIEWED, CARD_HOME_CLICKED],
  events: [{ name: CARD_BUTTON_VIEWED }, { name: CARD_HOME_CLICKED }],
};
