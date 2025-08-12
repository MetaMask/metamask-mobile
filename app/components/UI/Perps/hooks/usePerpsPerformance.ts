import { useRef, useCallback } from 'react';
import performance from 'react-native-performance';
import { setMeasurement } from '@sentry/react-native';
import { PerpsMeasurementName } from '../constants/performanceMetrics';

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
   * End timing and report to Sentry
   */
  const endMeasure = useCallback((name: PerpsMeasurementName): number => {
    const startTime = startTimes.current.get(name);
    if (!startTime) {
      console.warn(`No start time found for metric: ${name}`);
      return 0;
    }

    const duration = performance.now() - startTime;
    setMeasurement(name, duration, 'millisecond');
    startTimes.current.delete(name);
    return duration;
  }, []);

  /**
   * Measure a synchronous operation
   */
  const measure = useCallback(
    <T>(name: PerpsMeasurementName, operation: () => T): T => {
      const startTime = performance.now();
      const result = operation();
      const duration = performance.now() - startTime;
      setMeasurement(name, duration, 'millisecond');
      return result;
    },
    [],
  );

  /**
   * Measure an async operation
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
        setMeasurement(name, duration, 'millisecond');
        return result;
      } catch (error) {
        const duration = performance.now() - startTime;
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
