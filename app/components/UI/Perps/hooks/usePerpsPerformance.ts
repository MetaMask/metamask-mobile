import { useRef, useCallback } from 'react';
import performance from 'react-native-performance';
import { setMeasurement } from '@sentry/react-native';
import {
  PerpsMeasurementName,
  PerpsPerformanceTargets,
  PerpsMetricPriorities,
} from '../constants/performanceMetrics';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';

/**
 * Validate performance measurement against target
 */
const validatePerformance = (
  name: PerpsMeasurementName,
  duration: number,
): void => {
  const target = PerpsPerformanceTargets[name];
  if (!target) return;

  if (duration > target) {
    const percentOver = ((duration - target) / target) * 100;
    const priority = PerpsMetricPriorities[name] || 'MEDIUM';

    DevLogger.log('⚠️ Performance target exceeded', {
      metric: name,
      duration: `${duration.toFixed(0)}ms`,
      target: `${target}ms`,
      overBy: `+${percentOver.toFixed(1)}%`,
      priority,
    });
  }
};

/**
 * Simplified performance tracking hook
 * Replaces complex PerformanceTracker class with focused utilities
 */
export const usePerpsPerformance = () => {
  const startTimes = useRef<Map<string, number>>(new Map());

  /**
   * Start timing a metric
   */
  const startMeasure = useCallback((name: PerpsMeasurementName) => {
    startTimes.current.set(name, performance.now());
  }, []);

  /**
   * End timing and report to Sentry with validation
   */
  const endMeasure = useCallback((name: PerpsMeasurementName): number => {
    const startTime = startTimes.current.get(name);
    if (!startTime) {
      DevLogger.log(`No start time found for metric: ${name}`);
      return 0;
    }

    const duration = performance.now() - startTime;

    // Validate against performance targets
    validatePerformance(name, duration);

    // Report to Sentry
    setMeasurement(name, duration, 'millisecond');
    startTimes.current.delete(name);
    return duration;
  }, []);

  /**
   * Measure a synchronous operation with validation
   */
  const measure = useCallback(
    <T>(name: PerpsMeasurementName, operation: () => T): T => {
      const startTime = performance.now();
      const result = operation();
      const duration = performance.now() - startTime;

      // Validate against performance targets
      validatePerformance(name, duration);

      // Report to Sentry
      setMeasurement(name, duration, 'millisecond');
      return result;
    },
    [],
  );

  /**
   * Measure an async operation with validation
   */
  const measureAsync = useCallback(
    async <T>(
      name: PerpsMeasurementName,
      operation: () => Promise<T>,
    ): Promise<T> => {
      const startTime = performance.now();
      try {
        const result = await operation();
        const duration = performance.now() - startTime;

        // Validate against performance targets
        validatePerformance(name, duration);

        // Report to Sentry
        setMeasurement(name, duration, 'millisecond');
        return result;
      } catch (error) {
        const duration = performance.now() - startTime;

        // Validate even on error
        validatePerformance(name, duration);

        // Report to Sentry
        setMeasurement(name, duration, 'millisecond');
        throw error;
      }
    },
    [],
  );

  return {
    startMeasure,
    endMeasure,
    measure,
    measureAsync,
  };
};
