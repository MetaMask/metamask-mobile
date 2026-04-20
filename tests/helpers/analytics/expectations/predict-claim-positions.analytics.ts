import type { AnalyticsExpectations } from '../../../framework';

const POSITION_VIEWED = 'Predict Position Viewed';
const ACTIVITY_VIEWED = 'Predict Activity Viewed';

export const predictClaimPositionsAnalyticsExpectations: AnalyticsExpectations =
  {
    eventNames: [POSITION_VIEWED, ACTIVITY_VIEWED],
    events: [
      {
        name: POSITION_VIEWED,
        requiredDefinedPropertyKeys: ['open_positions_count'],
      },
      {
        name: ACTIVITY_VIEWED,
        requiredDefinedPropertyKeys: ['activity_type'],
      },
    ],
  };
