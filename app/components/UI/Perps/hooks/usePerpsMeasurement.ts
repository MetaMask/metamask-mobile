import { useEffect, useMemo, useRef } from 'react';
import performance from 'react-native-performance';
import { setMeasurement } from '@sentry/react-native';
import { PerpsMeasurementName } from '../constants/performanceMetrics';
import { PERFORMANCE_CONFIG } from '../constants/perpsConfig';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';

// Static helper functions - moved outside component to avoid recreation
const allTrue = (conditionArray: boolean[]): boolean =>
  conditionArray.length > 0 && conditionArray.every(Boolean);

const anyTrue = (conditionArray: boolean[]): boolean =>
  conditionArray.length > 0 && conditionArray.some(Boolean);

// Cache for boolean conversions to avoid repeated map operations
const toBooleanArray = (arr: unknown[]): boolean[] => arr.map(Boolean);

interface MeasurementOptions {
  measurementName: PerpsMeasurementName;

  // Simple API - most common case
  conditions?: boolean[]; // Start immediately, end when all conditions are true

  // Advanced API - full control
  startConditions?: boolean[];
  endConditions?: boolean[];
  resetConditions?: boolean[];

  debugContext?: Record<string, unknown>;
  // Legacy support for usePerpsScreenTracking pattern
  dependencies?: unknown[];
}

/**
 * Unified hook for performance measurement with conditional start/end logic
 *
 * Replaces manual useEffect patterns with a declarative approach:
 * - Automatically starts measurement when ALL startConditions are true (or immediately if none provided)
 * - Completes measurement when ALL endConditions are true
 * - Resets measurement when ANY resetCondition is true
 *
 * @example
 * // SIMPLE: Immediate single measurement (most common case)
 * usePerpsMeasurement({
 *   measurementName: PerpsMeasurementName.CLOSE_SCREEN_LOADED,
 *   // No conditions = immediate measurement
 * });
 *
 * @example
 * // CONDITIONAL: Wait for data before measuring
 * usePerpsMeasurement({
 *   measurementName: PerpsMeasurementName.ASSET_SCREEN_LOADED,
 *   conditions: [dataLoaded, !isLoading] // Start immediately, end when both true
 * });
 *
 * @example
 * // BOTTOM SHEET: With auto-reset
 * usePerpsMeasurement({
 *   measurementName: PerpsMeasurementName.LEVERAGE_BOTTOM_SHEET_LOADED,
 *   conditions: [isVisible, !!currentPrice], // Auto-resets when !isVisible
 *   debugContext: { asset }
 * });
 *
 * @example
 * // ADVANCED: Full control when needed
 * usePerpsMeasurement({
 *   measurementName: PerpsMeasurementName.COMPLEX_WORKFLOW,
 *   startConditions: [userInteracted, dataReady],
 *   endConditions: [workflowComplete, !hasErrors],
 *   resetConditions: [userCanceled, sessionExpired]
 * });
 *
 * @example
 * // LEGACY: usePerpsScreenTracking compatibility
 * usePerpsMeasurement({
 *   measurementName: PerpsMeasurementName.ASSET_SCREEN_LOADED,
 *   dependencies: [market, marketStats, !isLoadingHistory, !isLoadingPosition]
 * });
 */
export const usePerpsMeasurement = ({
  measurementName,
  conditions,
  startConditions,
  endConditions,
  resetConditions,
  debugContext = {},
  dependencies, // Legacy support
}: MeasurementOptions) => {
  const startTime = useRef<number | null>(null);
  const hasCompleted = useRef(false);
  const previousStartState = useRef(false);
  const previousEndState = useRef(false);

  // Note: debugContext is used directly rather than memoized since:
  // 1. It's typically used sparingly for debugging/logging
  // 2. Occasional re-runs are cheaper than expensive deep comparisons
  // 3. Most debugContext objects are small static objects anyway

  // Memoize smart defaults logic to avoid recalculation on every render
  const { actualStartConditions, actualEndConditions, actualResetConditions } =
    useMemo(() => {
      if (dependencies) {
        // Legacy usePerpsScreenTracking pattern
        return {
          actualStartConditions: [],
          actualEndConditions: toBooleanArray(dependencies),
          actualResetConditions: resetConditions || [],
        };
      }

      if (conditions) {
        // Simple API: start immediately, end when conditions are met
        return {
          actualStartConditions: [],
          actualEndConditions: conditions,
          // Smart default: reset when first condition becomes false (e.g., visibility)
          actualResetConditions:
            resetConditions || (conditions.length > 0 ? [!conditions[0]] : []),
        };
      }

      // NEW: Default case - immediate single measurement
      if (
        !startConditions &&
        !endConditions &&
        !resetConditions &&
        !dependencies
      ) {
        return {
          actualStartConditions: [],
          actualEndConditions: [true], // Always true = immediate completion
          actualResetConditions: [], // No reset needed for single measurement
        };
      }

      // Advanced API: explicit control
      return {
        actualStartConditions: startConditions || [],
        actualEndConditions: endConditions || [],
        actualResetConditions: resetConditions || [],
      };
    }, [
      dependencies,
      conditions,
      startConditions,
      endConditions,
      resetConditions,
    ]);

  // Memoize condition checks to avoid recalculation
  const shouldStart = useMemo(
    () => actualStartConditions.length === 0 || allTrue(actualStartConditions),
    [actualStartConditions],
  );

  const shouldEnd = useMemo(
    () => allTrue(actualEndConditions),
    [actualEndConditions],
  );

  const shouldReset = useMemo(
    () => anyTrue(actualResetConditions),
    [actualResetConditions],
  );

  useEffect(() => {
    // Handle reset conditions
    if (shouldReset && (startTime.current !== null || hasCompleted.current)) {
      startTime.current = null;
      hasCompleted.current = false;
      previousStartState.current = false;
      previousEndState.current = false;
      return;
    }

    // Handle start conditions
    if (
      shouldStart &&
      !previousStartState.current &&
      startTime.current === null
    ) {
      startTime.current = performance.now();
    }

    // Handle end conditions
    if (
      shouldEnd &&
      !previousEndState.current &&
      startTime.current !== null &&
      !hasCompleted.current
    ) {
      const duration = performance.now() - startTime.current;

      // Pre-build log object to avoid conditional spread operations
      const logData: Record<string, unknown> = {
        metric: measurementName,
        duration: `${duration.toFixed(0)}ms`,
        endConditions: actualEndConditions.length,
        context: debugContext,
      };

      // Add dependencies length only if needed (avoids conditional spread)
      if (dependencies) {
        logData.dependencies = dependencies.length;
      }

      DevLogger.log(
        `${PERFORMANCE_CONFIG.LOGGING_MARKERS.SENTRY_PERFORMANCE} PerpsScreen: ${measurementName} completed`,
        logData,
      );

      setMeasurement(measurementName, duration, 'millisecond');
      hasCompleted.current = true;
    }

    // Update previous states for edge detection
    previousStartState.current = shouldStart;
    previousEndState.current = shouldEnd;
  }, [
    measurementName,
    shouldStart,
    shouldEnd,
    shouldReset,
    debugContext,
    actualStartConditions,
    actualEndConditions,
    dependencies,
  ]);
};
