import type { AnalyticsExpectations } from '../../../framework';

const MARKET_DETAILS_OPENED = 'Predict Market Details Opened';
const POSITION_VIEWED = 'Predict Position Viewed';
const ACTIVITY_VIEWED = 'Predict Activity Viewed';

/**
 * Expected MetaMetrics payloads after opening a new predictions position.
 */
export const predictOpenPositionExpectations: AnalyticsExpectations = {
  eventNames: [MARKET_DETAILS_OPENED, POSITION_VIEWED, ACTIVITY_VIEWED],
  events: [
    {
      name: MARKET_DETAILS_OPENED,
      requiredDefinedPropertyKeys: ['entry_point', 'market_details_viewed'],
    },
    {
      name: POSITION_VIEWED,
      requiredDefinedPropertyKeys: ['open_positions_count'],
    },
    {
      name: ACTIVITY_VIEWED,
      containProperties: {
        activity_type: 'activity_list',
      },
    },
  ],
};
