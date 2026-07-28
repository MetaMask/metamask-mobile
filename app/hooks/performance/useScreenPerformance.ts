import { useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { endTrace, trace, TraceName, TraceOperation } from '../../util/trace';
import type { OnboardingScreenId } from './onboardingPerformanceIds';
import { getOnboardingPerformanceTags } from './onboardingPerformanceTags';
import { useRenderStormMonitor } from './useRenderStormMonitor';

interface UseScreenPerformanceConfig {
  screenId: OnboardingScreenId;
  contentReady: boolean;
  isEmpty: boolean;
  contentStateForTrace?: 'filled' | 'empty' | 'error';
  isLoading?: boolean;
  enabled?: boolean;
  reRenderThreshold?: number;
  reRenderWindowMs?: number;
}

/**
 * Onboarding screen performance telemetry via Sentry spans.
 *
 * 1. Time to Content — mount until `contentReady`.
 * 2. Data Fetch Latency — optional first `isLoading` cycle per mount.
 * 3. Re-render monitoring — breadcrumb when commits exceed threshold.
 */
export const useScreenPerformance = ({
  screenId,
  contentReady,
  isEmpty,
  contentStateForTrace,
  isLoading,
  enabled = true,
  reRenderThreshold,
  reRenderWindowMs,
}: UseScreenPerformanceConfig): void => {
  const ttcTraceId = useRef(uuidv4());
  const ttcStarted = useRef(false);
  const ttcEnded = useRef(false);

  const fetchTraceId = useRef(uuidv4());
  const fetchStarted = useRef(false);
  const fetchEnded = useRef(false);
  const prevIsLoading = useRef<boolean | undefined>(undefined);

  const traceContentState =
    contentStateForTrace ?? (isEmpty ? 'empty' : 'filled');

  useRenderStormMonitor({
    id: screenId,
    category: TraceOperation.OnboardingScreenPerformance,
    entityLabel: 'screen',
    breadcrumbData: { screen_id: screenId },
    enabled,
    reRenderThreshold,
    reRenderWindowMs,
  });

  useEffect(() => {
    if (!enabled) {
      return;
    }

    ttcTraceId.current = uuidv4();
    ttcEnded.current = false;
    trace({
      name: TraceName.OnboardingScreenTimeToContent,
      op: TraceOperation.OnboardingScreenPerformance,
      id: ttcTraceId.current,
      tags: getOnboardingPerformanceTags({ screen_id: screenId }),
    });
    ttcStarted.current = true;

    return () => {
      if (ttcStarted.current && !ttcEnded.current) {
        endTrace({
          name: TraceName.OnboardingScreenTimeToContent,
          id: ttcTraceId.current,
          data: {
            success: false,
            reason: 'unmounted',
            screen_id: screenId,
          },
        });
        ttcStarted.current = false;
      }
      if (fetchStarted.current && !fetchEnded.current) {
        endTrace({
          name: TraceName.OnboardingScreenDataFetch,
          id: fetchTraceId.current,
          data: {
            success: false,
            reason: 'unmounted',
            screen_id: screenId,
          },
        });
        fetchStarted.current = false;
      }
    };
  }, [enabled, screenId]);

  useEffect(() => {
    if (enabled && contentReady && ttcStarted.current && !ttcEnded.current) {
      endTrace({
        name: TraceName.OnboardingScreenTimeToContent,
        id: ttcTraceId.current,
        data: {
          success: true,
          screen_id: screenId,
          content_state: traceContentState,
        },
      });
      ttcEnded.current = true;
    }
  }, [enabled, contentReady, screenId, traceContentState]);

  useEffect(() => {
    if (!enabled || isLoading === undefined) {
      return;
    }

    const wasLoading = prevIsLoading.current;
    prevIsLoading.current = isLoading;

    if (isLoading && !fetchStarted.current && !fetchEnded.current) {
      fetchTraceId.current = uuidv4();
      trace({
        name: TraceName.OnboardingScreenDataFetch,
        op: TraceOperation.OnboardingScreenPerformance,
        id: fetchTraceId.current,
        tags: getOnboardingPerformanceTags({ screen_id: screenId }),
      });
      fetchStarted.current = true;
    }

    if (
      wasLoading === true &&
      !isLoading &&
      fetchStarted.current &&
      !fetchEnded.current
    ) {
      endTrace({
        name: TraceName.OnboardingScreenDataFetch,
        id: fetchTraceId.current,
        data: {
          success: true,
          screen_id: screenId,
          content_state: traceContentState,
        },
      });
      fetchStarted.current = false;
      fetchEnded.current = true;
    }
  }, [enabled, isLoading, screenId, traceContentState]);
};
