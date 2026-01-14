import type {
  AnalyticsPlatformAdapter,
  AnalyticsEventProperties,
  AnalyticsUserTraits,
} from '@metamask/analytics-controller';
import { E2E_METAMETRICS_TRACK_URL } from '../../../../util/test/utils';

/**
 * Sends an event to the E2E test mock server.
 * This is used to capture analytics events during E2E tests.
 *
 * Matches the behavior of MetaMetricsTestUtils.trackEvent() to ensure
 * compatibility with existing e2e tests.
 *
 * @param eventName - The name of the event
 * @param properties - Optional event properties (already merged by AnalyticsController)
 */
const sendEventToTestServer = (
  eventName: string,
  properties?: AnalyticsEventProperties,
): void => {
  // Use fire-and-forget pattern (similar to MetaMetricsTestUtils which is called without await)
  // The platform adapter interface is void, so we can't await
  // The fetch interceptor in shim.js will automatically proxy this through /proxy?url=...
  fetch(E2E_METAMETRICS_TRACK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      event: eventName,
      properties: properties || {},
    }),
  }).catch((error) => {
    // Only log non-network errors to avoid cluttering test output
    // Matches MetaMetricsTestUtils error handling behavior
    if (
      !(
        error instanceof TypeError &&
        error.message.includes('Network request failed')
      )
    ) {
      console.error('Error sending event to test server:', error);
    }
  });
};

/**
 * E2E platform adapter for the AnalyticsController.
 * Sends events to the E2E test mock server for test verification.
 */
export const createPlatformAdapter = (): AnalyticsPlatformAdapter => ({
  track(eventName: string, properties?: AnalyticsEventProperties): void {
    sendEventToTestServer(eventName, properties);
  },

  identify(userId: string, traits?: AnalyticsUserTraits): void {
    // Send identify events to the test server
    // Format as an identify event with userId and traits as properties
    sendEventToTestServer('User Identified', {
      userId,
      ...(traits || {}),
    });
  },

  view(name: string, properties?: AnalyticsEventProperties): void {
    // Send view/screen events to the test server
    // Format as a view event with screen name and properties
    sendEventToTestServer('Screen Viewed', {
      screen_name: name,
      ...(properties || {}),
    });
  },

  onSetupCompleted() {
    // This is a callback, not an event - no need to send to test server
  },
});
