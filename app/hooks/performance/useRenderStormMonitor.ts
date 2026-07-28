import { useEffect, useRef } from 'react';
import { addBreadcrumb } from '@sentry/react-native';
import performance from 'react-native-performance';
import { TraceOperation } from '../../util/trace';

interface UseRenderStormMonitorConfig {
  /** Primary identifier — e.g. screen_id or section_id */
  id: string;
  category: TraceOperation;
  /** Optional noun in the breadcrumb message, e.g. "section" or "screen". */
  entityLabel?: string;
  /** Extra fields merged into the breadcrumb data payload. */
  breadcrumbData?: Record<string, string | number>;
  enabled?: boolean;
  reRenderThreshold?: number;
  reRenderWindowMs?: number;
}

const DEFAULT_RE_RENDER_THRESHOLD = 3;
const DEFAULT_RE_RENDER_WINDOW_MS = 500;

/**
 * Records at most one Sentry breadcrumb per mount when commits exceed a threshold
 * within a sliding time window.
 */
export const useRenderStormMonitor = ({
  id,
  category,
  entityLabel,
  breadcrumbData,
  enabled = true,
  reRenderThreshold = DEFAULT_RE_RENDER_THRESHOLD,
  reRenderWindowMs = DEFAULT_RE_RENDER_WINDOW_MS,
}: UseRenderStormMonitorConfig): void => {
  const renderTimestamps = useRef<number[]>([]);
  const hasLoggedExcessiveRenders = useRef(false);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    hasLoggedExcessiveRenders.current = false;
    renderTimestamps.current = [];
  }, [enabled, id]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const effectiveReRenderThreshold = __DEV__
      ? reRenderThreshold + 1
      : reRenderThreshold;

    const now = performance.now();
    const timestamps = renderTimestamps.current;
    timestamps.push(now);

    const windowStart = now - reRenderWindowMs;
    while (timestamps.length > 0 && timestamps[0] < windowStart) {
      timestamps.shift();
    }

    if (
      timestamps.length > effectiveReRenderThreshold &&
      !hasLoggedExcessiveRenders.current
    ) {
      hasLoggedExcessiveRenders.current = true;
      const message = entityLabel
        ? `Excessive re-renders detected in ${entityLabel} "${id}": ${timestamps.length} renders in ${reRenderWindowMs}ms`
        : `Excessive re-renders detected in "${id}": ${timestamps.length} renders in ${reRenderWindowMs}ms`;
      addBreadcrumb({
        category,
        message,
        level: 'warning',
        data: {
          id,
          render_count: timestamps.length,
          window_ms: reRenderWindowMs,
          threshold: reRenderThreshold,
          ...breadcrumbData,
        },
      });
    }
  });
};
