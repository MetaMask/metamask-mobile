import type { AnalyticsExpectations } from '../../../framework';

const MARKET_DETAILS_OPENED = 'Predict Market Details Opened';
const PREDICT_FEED_VIEWED = 'Predict Feed Viewed';
const ASSET_VIEWED = 'Asset Viewed';

export const predictOpenPositionAnalyticsExpectations: AnalyticsExpectations = {
  eventNames: [MARKET_DETAILS_OPENED, PREDICT_FEED_VIEWED, ASSET_VIEWED],
  events: [
    {
      name: MARKET_DETAILS_OPENED,
      requiredDefinedPropertyKeys: ['entry_point', 'market_details_viewed'],
    },
    {
      name: PREDICT_FEED_VIEWED,
      containProperties: {
        predict_feed_tab: 'trending',
        entry_point: 'homepage_positions',
      },
    },
    {
      name: ASSET_VIEWED,
      containProperties: {
        trade_type: 'Predict',
        implementation_type: 'native',
        entry_point: 'homepage_positions',
      },
    },
  ],
};
