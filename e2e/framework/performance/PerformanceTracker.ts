import type { TestInfo } from '@playwright/test';
import { createLogger, type Logger, LogLevel } from '../logger';
import type TimerHelper from './TimersHelper';

interface DeviceInfo {
  name: string;
  osVersion: string;
  provider: string;
}

interface PerformanceStep {
  [timerId: string]: number;
}

interface PerformanceMetrics {
  steps: PerformanceStep[];
  total: number;
  device: DeviceInfo;
}

export class PerformanceTracker {
  private timers: TimerHelper[];
  private logger: Logger;

  constructor() {
    this.timers = [];
    this.logger = createLogger({
      name: 'PerformanceTracker',
      level: LogLevel.INFO,
    });
  }

  addTimer(timer: TimerHelper): void {
    if (this.timers.find((existingTimer) => existingTimer.id === timer.id)) {
      this.logger.debug(`Timer "${timer.id}" already exists, skipping`);
      return;
    }

    this.timers.push(timer);
    this.logger.debug(`Timer "${timer.id}" added`);
  }

  async storeSessionData(sessionId: string, testTitle: string): Promise<void> {
    // Store in process environment
    process.env.TEMP_SESSION_ID = sessionId;
    process.env.TEMP_TEST_TITLE = testTitle;
    this.logger.debug(`Session data stored: ${sessionId}, ${testTitle}`);
  }

  async attachToTest(testInfo: TestInfo): Promise<PerformanceMetrics> {
    const steps: PerformanceStep[] = [];
    let totalSeconds = 0;

    for (const timer of this.timers) {
      const duration = timer.getDuration();
      const durationInSeconds = timer.getDurationInSeconds();

      if (duration !== null && !isNaN(duration) && duration > 0) {
        // Create a step object with the timer id as key and duration as value
        steps.push({ [timer.id]: duration });
        totalSeconds += durationInSeconds;
      }
    }

    // Safely get device info with fallbacks
    const projectUse = testInfo.project?.use as
      | { device?: DeviceInfo }
      | undefined;
    const deviceInfo: DeviceInfo = projectUse?.device ?? {
      name: 'Unknown',
      osVersion: 'Unknown',
      provider: 'unknown',
    };

    const metrics: PerformanceMetrics = {
      steps,
      total: totalSeconds,
      device: deviceInfo,
    };

    try {
      await testInfo.attach(`performance-metrics-${testInfo.title}`, {
        body: JSON.stringify(metrics),
        contentType: 'application/json',
      });
      this.logger.info(
        `Performance metrics attached for test: ${testInfo.title}`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to attach performance metrics: ${errorMessage}`,
      );
      throw error;
    }

    return metrics;
  }

  getTimers(): TimerHelper[] {
    return this.timers;
  }
}
