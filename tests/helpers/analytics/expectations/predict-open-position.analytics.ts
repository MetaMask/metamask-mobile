import type { AnalyticsExpectations } from '../../../framework';

const MARKET_DETAILS_OPENED = 'Predict Market Details Opened';
const PREDICT_FEED_VIEWED = 'Predict Feed Viewed';

export const predictOpenPositionAnalyticsExpectations: AnalyticsExpectations = {
  eventNames: [MARKET_DETAILS_OPENED, PREDICT_FEED_VIEWED],
  events: [
    {
      name: MARKET_DETAILS_OPENED,
      requiredDefinedPropertyKeys: ['entry_point', 'market_details_viewed'],
    },
    {
      name: PREDICT_FEED_VIEWED,
      containProperties: {
        predict_feed_tab: 'trending',
        entry_point: 'main_trade_button',
      },
    },
  ],
};
