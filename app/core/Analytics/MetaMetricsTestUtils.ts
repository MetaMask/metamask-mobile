import { ITrackingEvent } from './MetaMetrics.types';
import axios from 'axios';

class MetaMetricsTestUtils {
  private static instance: MetaMetricsTestUtils;

  public static getInstance(): MetaMetricsTestUtils {
    if (!MetaMetricsTestUtils.instance) {
      MetaMetricsTestUtils.instance = new MetaMetricsTestUtils();
    }
    return MetaMetricsTestUtils.instance;
  }

  /**
   * Sends an event to the test server
   */
  public async trackEvent(event: ITrackingEvent): Promise<void> {
    try {
      await axios.post('http://localhost:8000/track_test_mm', {
        event: event.name,
        properties: {
          ...event.properties,
          ...event.sensitiveProperties,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.warn('TEST EVENT ERROR: mock server is likely down', error);
    }
  }
}

export default MetaMetricsTestUtils;
