/**
 * Performance Bridge for E2E Testing
 * Sends performance data to the fixture server for E2E test collection
 */

import { getFixturesServerPortInApp } from '../../app/util/test/utils';

interface PerformanceMetric {
  eventName: string;
  timestamp: number;
  duration?: number;
  metadata: Record<string, unknown>;
  id?: string;
  parentId?: string;
}

interface PerformanceSession {
  sessionId: string;
  startTime: number;
  environment: {
    branch: string;
    commitHash: string;
    platform: string;
    appVersion: string;
  };
}

class PerformanceBridge {
  private fixtureServerPort: number;
  private baseUrl: string;
  private isEnabled: boolean = false;

  constructor() {
    this.fixtureServerPort = getFixturesServerPortInApp();
    this.baseUrl = `http://localhost:${this.fixtureServerPort}`;
    this.isEnabled = process.env.IS_TEST === 'true';
  }

  /**
   * Send a performance metric to the fixture server
   */
  async sendMetric(metric: PerformanceMetric): Promise<void> {
    if (!this.isEnabled) {
      return;
    }

    try {
      const response = await fetch(`${this.baseUrl}/performance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ metric }),
      });

      if (!response.ok) {
        console.warn('Failed to send performance metric to fixture server');
      }
    } catch (error) {
      // Silently fail in production, but log in development
      if (__DEV__) {
        console.warn('Performance bridge error:', error);
      }
    }
  }

  /**
   * Send session data to the fixture server
   */
  async sendSession(session: PerformanceSession): Promise<void> {
    if (!this.isEnabled) {
      return;
    }

    try {
      const response = await fetch(`${this.baseUrl}/performance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ session }),
      });

      if (!response.ok) {
        console.warn('Failed to send performance session to fixture server');
      }
    } catch (error) {
      // Silently fail in production, but log in development
      if (__DEV__) {
        console.warn('Performance bridge error:', error);
      }
    }
  }

  /**
   * Clear performance data on the fixture server
   */
  async clearPerformanceData(): Promise<void> {
    if (!this.isEnabled) {
      return;
    }

    try {
      const response = await fetch(`${this.baseUrl}/performance`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        console.warn('Failed to clear performance data on fixture server');
      }
    } catch (error) {
      // Silently fail in production, but log in development
      if (__DEV__) {
        console.warn('Performance bridge error:', error);
      }
    }
  }

  /**
   * Get performance data from the fixture server
   */
  async getPerformanceData(): Promise<{ metrics: PerformanceMetric[]; session: PerformanceSession } | null> {
    if (!this.isEnabled) {
      return null;
    }

    try {
      const response = await fetch(`${this.baseUrl}/performance.json`);
      
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      // Silently fail in production, but log in development
      if (__DEV__) {
        console.warn('Performance bridge error:', error);
      }
    }

    return null;
  }
}

// Global instance
export const performanceBridge = new PerformanceBridge();

export default PerformanceBridge;
