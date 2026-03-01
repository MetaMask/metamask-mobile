import { createLogger } from '../framework/logger';
import type { MetricStep, DeviceInfo, TeamInfo } from './types';

const logger = createLogger({ name: 'PerformanceTracker' });

interface Timer {
  id: string;
  threshold: number | null;
  baseThreshold: number | null;
  getDuration(): number | null;
  getDurationInSeconds(): number;
  hasThreshold(): boolean;
}

interface MetricsOutput {
  steps: MetricStep[];
  timestamp: string;
  thresholdMarginPercent: number;
  team: TeamInfo | null;
  total: number;
  totalThreshold: number | null;
  hasThresholds: boolean;
  totalValidation: {
    passed: boolean;
    exceeded: number | null;
    percentOver: string | null;
  } | null;
  device: DeviceInfo;
}

/**
 * Timer management and metrics attachment for performance tests.
 * No BrowserStack or provider-specific concerns — those live in enrichers.
 */
export class PerformanceTracker {
  timers: Timer[];
  teamInfo: TeamInfo | null;

  constructor() {
    this.timers = [];
    this.teamInfo = null;
  }

  setTeamInfo(teamInfo: TeamInfo): void {
    this.teamInfo = teamInfo;
  }

  addTimers(...timers: Timer[]): void {
    timers.forEach((timer) => {
      this.addTimer(timer);
    });
  }

  addTimer(timer: Timer): void {
    if (this.timers.find((existingTimer) => existingTimer.id === timer.id)) {
      return;
    }
    this.timers.push(timer);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async attachToTest(testInfo: any): Promise<MetricsOutput> {
    const THRESHOLD_MARGIN_PERCENT = 10;
    const metrics: MetricsOutput = {
      steps: [],
      timestamp: new Date().toISOString(),
      thresholdMarginPercent: THRESHOLD_MARGIN_PERCENT,
      team: this.teamInfo,
      total: 0,
      totalThreshold: null,
      hasThresholds: false,
      totalValidation: null,
      device: { name: 'Unknown', osVersion: 'Unknown', provider: 'unknown' },
    };

    let totalSeconds = 0;
    let totalThresholdMs = 0;
    let allHaveThresholds = true;

    for (const timer of this.timers) {
      const duration = timer.getDuration();
      const durationInSeconds = timer.getDurationInSeconds();

      if (duration !== null && !isNaN(duration) && duration > 0) {
        const threshold = timer.threshold;
        const hasThreshold = threshold !== null;
        const passed = !hasThreshold || duration <= (threshold ?? 0);
        const exceeded =
          hasThreshold && !passed ? duration - (threshold ?? 0) : null;
        const percentOver =
          exceeded !== null && threshold
            ? ((exceeded / threshold) * 100).toFixed(1)
            : null;

        const stepObject: MetricStep = {
          name: timer.id,
          duration,
          baseThreshold: timer.baseThreshold,
          threshold: timer.threshold,
          validation: hasThreshold
            ? {
                passed,
                exceeded,
                percentOver: percentOver ? `${percentOver}%` : null,
              }
            : null,
        };
        metrics.steps.push(stepObject);

        totalSeconds += durationInSeconds;

        if (timer.threshold !== null) {
          totalThresholdMs += timer.threshold;
        } else {
          allHaveThresholds = false;
        }
      }
    }

    metrics.total = totalSeconds;
    metrics.totalThreshold = allHaveThresholds ? totalThresholdMs : null;
    metrics.hasThresholds = this.timers.some((t) => t.hasThreshold());

    // Add total validation if all steps have thresholds
    if (allHaveThresholds && totalThresholdMs > 0) {
      const totalDurationMs = totalSeconds * 1000;
      const totalPassed = totalDurationMs <= totalThresholdMs;
      const totalExceeded = !totalPassed
        ? totalDurationMs - totalThresholdMs
        : null;
      const totalPercentOver =
        totalExceeded !== null
          ? ((totalExceeded / totalThresholdMs) * 100).toFixed(1)
          : null;

      metrics.totalValidation = {
        passed: totalPassed,
        exceeded: totalExceeded,
        percentOver: totalPercentOver ? `${totalPercentOver}%` : null,
      };
    } else {
      metrics.totalValidation = null;
    }

    // Safely get device info with fallbacks
    const deviceInfo = testInfo?.project?.use?.device;
    if (deviceInfo) {
      metrics.device = deviceInfo;
    } else {
      metrics.device = {
        name: 'Unknown',
        osVersion: 'Unknown',
        provider: 'unknown',
      };
    }

    try {
      await testInfo.attach(`performance-metrics-${testInfo.title}`, {
        body: JSON.stringify(metrics),
        contentType: 'application/json',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to attach performance metrics: ${message}`);
      throw error;
    }

    return metrics;
  }
}
