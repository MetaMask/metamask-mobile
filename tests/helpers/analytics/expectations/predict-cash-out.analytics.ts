import type { AnalyticsExpectations } from '../../../framework';

const MARKET_DETAILS_OPENED = 'Predict Market Details Opened';
const ACTIVITY_VIEWED = 'Predict Activity Viewed';

/**
 * Expected MetaMetrics payloads after the predictions cash-out flow (Spurs vs. Pelicans scenario).
 *
 * Note: "Predict Position Viewed" is not asserted here. It is only emitted from legacy
 * `PredictHomePositions` inside `PredictTabView` when the wallet Predict tab is visible.
 * With homepage sections v1 (`remoteFeatureFlagHomepageSectionsV1Enabled`), the wallet uses
 * `Homepage` + `PredictionsSection` instead — that path does not call `trackPositionViewed`.
 */
export const predictCashOutFlowAnalyticsExpectations: AnalyticsExpectations = {
  eventNames: [MARKET_DETAILS_OPENED, ACTIVITY_VIEWED],
  events: [
    {
      name: MARKET_DETAILS_OPENED,
      requiredDefinedPropertyKeys: ['entry_point', 'market_details_viewed'],
    },
    {
      name: ACTIVITY_VIEWED,
      containProperties: {
        activity_type: 'activity_list',
      },
    },
  ],
};
