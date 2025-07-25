import { ITrackingEvent } from './MetaMetrics.types';
import { E2E_METAMETRICS_TRACK_URL } from '../../util/test/utils';

export default class MetaMetricsTestUtils {
  public static instance: MetaMetricsTestUtils | null = null;
  private readonly sendMetaMetricsinE2E: boolean;

  public static getInstance(): MetaMetricsTestUtils {
    if (!MetaMetricsTestUtils.instance) {
      MetaMetricsTestUtils.instance = new MetaMetricsTestUtils();
    }
    return MetaMetricsTestUtils.instance;
  }

  /**
   * Resets the singleton instance.
   * This is used for testing purposes to ensure a fresh instance is created.
   */
  public static resetInstance(): void {
    MetaMetricsTestUtils.instance = null;
  }

  constructor() {
    /**
     * This class is used to send test events to the E2E test mock server.
     * It is initialized with the `sendMetaMetricsinE2E` flag from the launch arguments.
     * To enable sending events, ensure you launch the app with the appropriate
     * You should also ensure you have the IS_TEST test env variable set to `true`
     * as this is the main safeguard to prevent sending events to the real server.
     */
    this.sendMetaMetricsinE2E = true;
  }

  /**
   * Sends an event to the test server
   */
  public async trackEvent(event: ITrackingEvent): Promise<void> {
    if (!this.sendMetaMetricsinE2E) {
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
        }),
      });
    } catch (error) {
      if (
        !(
          error instanceof TypeError &&
          error.message.includes('Network request failed')
        )
      ) {
        console.error('Error sending event to test server:', error);
      }
    }
  }
}
