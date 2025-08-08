import {
  PerpsMeasurementName,
  PerpsPerformanceTargets,
  PerpsMetricPriorities,
  PerpsPerformancePriority,
} from '../constants/performanceMetrics';
import { PerpsEventProperties } from '../constants/eventNames';
import { setMeasurement } from '@sentry/react-native';
import performance from 'react-native-performance';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';

/**
 * Debug logger for performance - uses constants
 */
export const debugPerformance = (
  measurementName: PerpsMeasurementName,
  value: number,
) => {
  if (!__DEV__) return;

  const target = PerpsPerformanceTargets[measurementName];
  const priority = PerpsMetricPriorities[measurementName];

  const status = !target
    ? 'INFO'
    : value <= target
    ? 'PASS ✅'
    : value <= target * 1.5
    ? 'WARN ⚠️'
    : 'FAIL ❌';

  const color = status.includes('PASS')
    ? '\x1b[32m'
    : status.includes('WARN')
    ? '\x1b[33m'
    : status.includes('FAIL')
    ? '\x1b[31m'
    : '\x1b[36m';

  DevLogger.log(
    `${color}[PERF${
      priority === PerpsPerformancePriority.HIGH ? '-HIGH' : ''
    }] ${measurementName}: ${value.toFixed(2)}ms ${
      target ? `(target: ${target}ms)` : ''
    } ${status}\x1b[0m`,
  );
};

/**
 * Measure and report performance with debug output
 */
export const measurePerformance = (
  measurementName: PerpsMeasurementName,
  startTime: number,
  endTime?: number,
): number => {
  const duration = (endTime || performance.now()) - startTime;

  // Report to Sentry
  setMeasurement(measurementName, duration, 'millisecond');

  // Debug output
  debugPerformance(measurementName, duration);

  return duration;
};

/**
 * Debug logger for events - validates property keys
 */
export const debugEvent = (
  eventName: string,
  properties: Record<string, unknown>,
) => {
  if (!__DEV__) return;

  DevLogger.log(`[EVENT] ${eventName}`, properties);

  // Validate properties use correct keys
  const warnings = [];
  if (properties.timestamp && !properties[PerpsEventProperties.TIMESTAMP]) {
    warnings.push(`Use '${PerpsEventProperties.TIMESTAMP}' not 'timestamp'`);
  }
  if (properties.asset && !properties[PerpsEventProperties.ASSET]) {
    warnings.push(`Use '${PerpsEventProperties.ASSET}' not 'asset'`);
  }
  if (properties.direction && !properties[PerpsEventProperties.DIRECTION]) {
    warnings.push(`Use '${PerpsEventProperties.DIRECTION}' not 'direction'`);
  }

  if (warnings.length > 0) {
    DevLogger.log('[EVENT PROPERTY WARNING]', warnings.join(', '));
  }
};

/**
 * Performance tracker class for components
 */
export class PerformanceTracker {
  private startTime: number;
  private measurements: Map<PerpsMeasurementName, number> = new Map();
  private componentName: string;

  constructor(componentName: string) {
    this.componentName = componentName;
    this.startTime = performance.now();

    if (__DEV__) {
      DevLogger.log(
        `[PERF] 🚀 Starting performance tracking for ${componentName}`,
      );
    }
  }

  /**
   * Mark a measurement point
   */
  mark(measurementName: PerpsMeasurementName): number {
    const elapsed = performance.now() - this.startTime;
    this.measurements.set(measurementName, elapsed);

    // Report to Sentry
    setMeasurement(measurementName, elapsed, 'millisecond');

    // Debug output
    debugPerformance(measurementName, elapsed);

    return elapsed;
  }

  /**
   * Measure time between two points
   */
  measure(
    measurementName: PerpsMeasurementName,
    startMark: PerpsMeasurementName,
    endMark?: PerpsMeasurementName,
  ): number {
    const startTime = this.measurements.get(startMark);
    const endTime = endMark
      ? this.measurements.get(endMark)
      : performance.now() - this.startTime;

    if (startTime === undefined || (endMark && endTime === undefined)) {
      DevLogger.log(
        `[PERF] WARNING: Missing marks for measurement ${measurementName}`,
      );
      return 0;
    }

    const duration = (endTime || 0) - startTime;

    // Report to Sentry
    setMeasurement(measurementName, duration, 'millisecond');

    // Debug output
    debugPerformance(measurementName, duration);

    return duration;
  }

  /**
   * Get all measurements
   */
  getAllMeasurements(): Record<string, number> {
    const result: Record<string, number> = {};
    this.measurements.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  /**
   * Show performance summary table
   */
  showSummary(): void {
    if (!__DEV__) return;

    DevLogger.log(`\n📊 Performance Summary for ${this.componentName}:`);

    const data = Array.from(this.measurements.entries()).map(
      ([name, value]) => {
        const target = PerpsPerformanceTargets[name];
        const priority = PerpsMetricPriorities[name];

        return {
          Measurement: name,
          'Time (ms)': value.toFixed(2),
          'Target (ms)': target || 'N/A',
          Priority: priority || 'MEDIUM',
          Status: !target
            ? '---'
            : value <= target
            ? '✅ PASS'
            : value <= target * 1.5
            ? '⚠️ WARN'
            : '❌ FAIL',
          'Over by':
            target && value > target
              ? `+${(value - target).toFixed(2)}ms`
              : '---',
        };
      },
    );

    DevLogger.log('Performance Data:', data);
  }
}

/**
 * Helper to track screen load performance
 */
export const trackScreenLoad = (
  screenName: PerpsMeasurementName,
  onScreenReady: () => boolean | Promise<boolean>,
): void => {
  const startTime = performance.now();

  const checkReady = async () => {
    const isReady = await onScreenReady();
    if (isReady) {
      measurePerformance(screenName, startTime);
    } else {
      // Retry after a short delay
      setTimeout(checkReady, 50);
    }
  };

  // Start checking
  setTimeout(checkReady, 0);
};

/**
 * Helper to create event properties with validation
 */
export const createEventProperties = (
  baseProps: Record<string, unknown>,
  requiredProps?: string[],
): Record<string, unknown> => {
  // Always add timestamp
  const props = {
    [PerpsEventProperties.TIMESTAMP]: Date.now(),
    ...baseProps,
  };

  // Validate required properties in dev
  if (__DEV__ && requiredProps) {
    const missing = requiredProps.filter((prop) => !(prop in props));
    if (missing.length > 0) {
      DevLogger.log(
        `[EVENT] Missing required properties: ${missing.join(', ')}`,
      );
    }
  }

  return props;
};
