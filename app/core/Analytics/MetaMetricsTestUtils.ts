import { LaunchArguments } from 'react-native-launch-arguments';
import { ITrackingEvent } from './MetaMetrics.types';
import { E2E_METAMETRICS_TRACK_URL } from '../../util/test/utils';

class MetaMetricsTestUtils {
  private static instance: MetaMetricsTestUtils;
  private sendMetaMetricsEventsinTest = false

  public static getInstance(): MetaMetricsTestUtils {
    if (!MetaMetricsTestUtils.instance) {
      MetaMetricsTestUtils.instance = new MetaMetricsTestUtils();
    }
    return MetaMetricsTestUtils.instance;
  }

  private constructor() {
    /**
     * This class is used to send test events to the E2E test mock server.
     * It is initialized with the `sendMetaMetricsinE2E` flag from the launch arguments.
     * To enable sending events, ensure you launch the app with the appropriate
     * You should also ensure you have the IS_TEST test env variable set to `true`.
     * launch arguments, as shown below:
     *
     * ```typescript
     * await TestHelpers.launchApp({
     *   launchArgs: {
     *     sendMetaMetricsinE2E: true,
     *   }
     * });
     * ```
     */
    this.sendMetaMetricsEventsinTest = LaunchArguments.value<{ sendMetaMetricsinE2E?: boolean }>().sendMetaMetricsinE2E ?? false;
  }

  /**
   * Sends an event to the test server
   */
  public async trackEvent(event: ITrackingEvent): Promise<void> {
    if (!this.sendMetaMetricsEventsinTest) {
      return;
    }

    try {
      await fetch(E2E_METAMETRICS_TRACK_URL, {
        method: 'POST',
        body: JSON.stringify({
          event: event.name,
          properties: {
            ...event.properties,
            ...event.sensitiveProperties,
          },
})
      });
    } catch (error) {
      if (!(error instanceof TypeError && error.message.includes('Network request failed'))) {
        console.error('Error sending event to test server:', error);
      }
    }
  }
}

export default MetaMetricsTestUtils;
