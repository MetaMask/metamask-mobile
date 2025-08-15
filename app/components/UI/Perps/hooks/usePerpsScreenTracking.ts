import { useEffect, useRef } from 'react';
import performance from 'react-native-performance';
import { setMeasurement } from '@sentry/react-native';
import { PerpsMeasurementName } from '../constants/performanceMetrics';

interface ScreenTrackingOptions {
  screenName: PerpsMeasurementName;
  dependencies?: unknown[];
}

/**
 * Simplified hook for screen load performance tracking
 * Only tracks Sentry metrics, no events
 */
export const usePerpsScreenTracking = ({
  screenName,
  dependencies = [],
}: ScreenTrackingOptions) => {
  const screenLoadStart = useRef(performance.now());
  const hasTracked = useRef(false);

  useEffect(() => {
    if (!hasTracked.current && dependencies.every((dep) => dep)) {
      // Measure screen load time
      const loadTime = performance.now() - screenLoadStart.current;
      setMeasurement(screenName, loadTime, 'millisecond');
      hasTracked.current = true;
    }
    // eslint-disable-next-line react-compiler/react-compiler
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);
};
