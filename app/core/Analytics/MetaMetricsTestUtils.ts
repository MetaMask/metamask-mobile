import { LaunchArguments } from 'react-native-launch-arguments';
import { ITrackingEvent } from './MetaMetrics.types';
import axios, { isAxiosError } from 'axios';

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
      await axios.post(
        `http://localhost:8000/mm_test_track`,
        {
          event: event.name,
          properties: {
            ...event.properties,
            ...event.sensitiveProperties,
          },
        },
        {
          headers: {
            'X-Detox-Test-Id': this.detoxTestId,
          },
        },
      );
    } catch (error) {
      if (isAxiosError(error) && error.message === 'Network Error') {
        // Ignore network errors, as they are expected when the test server is not running
        return;
      }
    }
  }
}

export default MetaMetricsTestUtils;
