import type { AnalyticsExpectations } from '../../../framework';

const MARKET_DETAILS_OPENED = 'Predict Market Details Opened';
const ASSET_VIEWED = 'Asset Viewed';

export const predictOpenPositionAnalyticsExpectations: AnalyticsExpectations = {
  eventNames: [MARKET_DETAILS_OPENED, ASSET_VIEWED],
  events: [
    {
      name: MARKET_DETAILS_OPENED,
      requiredDefinedPropertyKeys: ['entry_point', 'market_details_viewed'],
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
