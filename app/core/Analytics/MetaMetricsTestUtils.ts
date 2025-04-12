import { LaunchArguments } from 'react-native-launch-arguments';
import { ITrackingEvent } from './MetaMetrics.types';

class MetaMetricsTestUtils {
  private static instance: MetaMetricsTestUtils;
  private detoxTestId: string | null = null;

  public static getInstance(): MetaMetricsTestUtils {
    if (!MetaMetricsTestUtils.instance) {
      MetaMetricsTestUtils.instance = new MetaMetricsTestUtils();
    }
    return MetaMetricsTestUtils.instance;
  }

  private constructor() {
    /**
     * This class is used to send test events to the detox test server.
     * It is initialized with the `detoxTestId` from the launch arguments.
     * To add a `detoxTestId`, ensure you launch the app with the appropriate
     * launch arguments, as shown below:
     *
     * ```typescript
     * await TestHelpers.launchApp({
     *   newInstance: true,
     *   launchArgs: {
     *     detoxTestId,
     *   }
     * });
     * ```
     */
    this.detoxTestId =
      LaunchArguments.value<{ detoxTestId?: string }>().detoxTestId || null;
  }

  /**
   * Sends an event to the test server
   */
  public async trackEvent(event: ITrackingEvent): Promise<void> {
    if (!this.detoxTestId) {
      return;
    }

    try {
      await fetch('https://metametrics.test/track-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          event: event.name,
          properties: {
            ...event.properties,
            ...event.sensitiveProperties,
          },
        })
      });
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('Network request failed')) {
        // Ignore network errors, as they are expected when the test server is not running
      } else {
        // Log other errors
        // eslint-disable-next-line no-console
        console.error('Error sending event to test server:', error);
      }
    }
  }
}

export default MetaMetricsTestUtils;
