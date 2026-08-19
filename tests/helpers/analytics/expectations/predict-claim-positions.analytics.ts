import type { AnalyticsExpectations } from '../../../framework';

const ACTIVITY_VIEWED = 'Predict Activity Viewed';

export const predictClaimPositionsAnalyticsExpectations: AnalyticsExpectations =
  {
    eventNames: [ACTIVITY_VIEWED],
    events: [
      {
        name: ACTIVITY_VIEWED,
        requiredDefinedPropertyKeys: ['activity_type'],
      },
    ],
  };
