import { useEffect, useRef } from 'react';
import { MetaMetricsEvents } from '../../../../core/Analytics/MetaMetrics.events';
import {
  PerpsEventProperties,
  PerpsEventValues,
} from '../constants/eventNames';
import { usePerpsEventTracking } from './usePerpsEventTracking';

interface ValidationTrackingOptions {
  /** Array of error messages to track */
  errors: string[];
  /** Array of warning messages to track (optional) */
  warnings?: string[];
  /** Asset symbol for tracking context */
  asset: string;
  /** Screen type for tracking context */
  screenType: string;
  /** Screen name for tracking context (optional) */
  screenName?: string;
}

/**
 * Hook to track validation errors and warnings for analytics.
 * Prevents duplicate tracking by maintaining refs of already tracked messages.
 * Automatically cleans up tracked messages when they're resolved.
 *
 * @example
 * ```tsx
 * usePerpsValidationTracking({
 *   errors: validationResult.errors,
 *   warnings: validationResult.warnings,
 *   asset: orderForm.asset,
 *   screenType: PerpsEventValues.SCREEN_TYPE.TRADING,
 *   screenName: PerpsEventValues.SCREEN_NAME.PERPS_ORDER,
 * });
 * ```
 */
export const usePerpsValidationTracking = ({
  errors,
  warnings,
  asset,
  screenType,
  screenName,
}: ValidationTrackingOptions): void => {
  const { track } = usePerpsEventTracking();
  const trackedErrorsRef = useRef<Set<string>>(new Set());
  const trackedWarningsRef = useRef<Set<string>>(new Set());

  // Track errors when they're displayed (only new ones)
  useEffect(() => {
    if (errors.length > 0) {
      errors.forEach((error) => {
        // Only track if this error hasn't been tracked before
        if (!trackedErrorsRef.current.has(error)) {
          trackedErrorsRef.current.add(error);
          track(MetaMetricsEvents.PERPS_ERROR, {
            [PerpsEventProperties.ERROR_TYPE]:
              PerpsEventValues.ERROR_TYPE.VALIDATION,
            [PerpsEventProperties.ERROR_MESSAGE]: error,
            [PerpsEventProperties.SCREEN_TYPE]: screenType,
            [PerpsEventProperties.ASSET]: asset,
            ...(screenName && {
              [PerpsEventProperties.SCREEN_NAME]: screenName,
            }),
          });
        }
      });
      // Clean up tracked errors that are no longer present
      const currentErrors = new Set(errors);
      trackedErrorsRef.current = new Set(
        Array.from(trackedErrorsRef.current).filter((error) =>
          currentErrors.has(error),
        ),
      );
    } else {
      // Clear tracked errors when there are no errors
      trackedErrorsRef.current.clear();
    }
  }, [errors, track, asset, screenType, screenName]);

  // Track warnings when they're displayed (only new ones)
  useEffect(() => {
    if (warnings && warnings.length > 0) {
      warnings.forEach((warning) => {
        // Only track if this warning hasn't been tracked before
        if (!trackedWarningsRef.current.has(warning)) {
          trackedWarningsRef.current.add(warning);
          track(MetaMetricsEvents.PERPS_ERROR, {
            [PerpsEventProperties.WARNING_MESSAGE]: warning,
            [PerpsEventProperties.WARNING_TYPE]:
              PerpsEventValues.WARNING_TYPE.MINIMUM_ORDER_SIZE,
            [PerpsEventProperties.SCREEN_TYPE]: screenType,
            [PerpsEventProperties.ASSET]: asset,
            ...(screenName && {
              [PerpsEventProperties.SCREEN_NAME]: screenName,
            }),
          });
        }
      });
      // Clean up tracked warnings that are no longer present
      const currentWarnings = new Set(warnings);
      trackedWarningsRef.current = new Set(
        Array.from(trackedWarningsRef.current).filter((warning) =>
          currentWarnings.has(warning),
        ),
      );
    } else {
      // Clear tracked warnings when there are no warnings
      trackedWarningsRef.current.clear();
    }
  }, [warnings, track, asset, screenType, screenName]);
};

export default usePerpsValidationTracking;
