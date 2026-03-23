import type { AnalyticsExpectations } from '../../../framework';

const TEST_EVENT = 'Test Event';

/**
 * Expected MetaMetrics payloads after the preinstalled snap `snap_trackEvent` call.
 */
export const snapPreinstalledTrackEventExpectations: AnalyticsExpectations = {
  eventNames: [TEST_EVENT],
  expectedTotalCount: 1,
  events: [
    {
      name: TEST_EVENT,
      matchProperties: {
        test_property: 'test value',
      },
    },
  ],
};
