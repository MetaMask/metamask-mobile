import type { AnalyticsExpectations } from '../../../framework';

const TEST_EVENT = 'Test Event';

export const testSnapPreinstalledAnalyticsExpectations: AnalyticsExpectations =
  {
    eventNames: [TEST_EVENT],
    events: [
      {
        name: TEST_EVENT,
        containProperties: { test_property: 'test value' },
      },
    ],
  };
