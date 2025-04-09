import { ITrackingEvent } from './MetaMetrics.types';
import axios from 'axios';

class MetaMetricsTestUtils {
  private static instance: MetaMetricsTestUtils;
  private testServerUrl: string;

  private constructor() {
    // TODO: use env variable for test server URL
    // For now, we are using a hardcoded URL for the test server
    this.testServerUrl = 'http://localhost:8000';
  }

  public static getInstance(): MetaMetricsTestUtils {
    if (!MetaMetricsTestUtils.instance) {
      MetaMetricsTestUtils.instance = new MetaMetricsTestUtils();
    }
    return MetaMetricsTestUtils.instance;
  }

  public setTestServerUrl(url: string): void {
    this.testServerUrl = url;
  }

  /**
   * Sends an event to the test server
   */
  public async trackEvent(event: ITrackingEvent): Promise<void> {
    try {
      await axios.post(`${this.testServerUrl}/track`, {
        event: event.name,
        properties: {
          ...event.properties,
          ...event.sensitiveProperties,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to send event to test server:', error);
    }
  }
}

export default MetaMetricsTestUtils;
