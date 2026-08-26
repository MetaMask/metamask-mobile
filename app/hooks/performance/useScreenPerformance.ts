import { useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { endTrace, trace, TraceName, TraceOperation } from '../../util/trace';
import {
  getOnboardingPerformanceTags,
  type OnboardingScreenId,
} from './onboardingPerformanceIds';
import { useRenderStormMonitor } from './useRenderStormMonitor';

interface UseScreenPerformanceConfig {
  screenId: OnboardingScreenId;
  contentReady: boolean;
  isEmpty: boolean;
  isLoading?: boolean;
  /**
   * Optional TTFD signal. When the screen's primary content is fully
   * interactive (all data loaded, animations done, user can act).
   * Defaults to `contentReady` when not provided — set explicitly when
   * TTFD differs from first paint (e.g. waiting for async deps after
   * initial content renders).
   */
  fullyDisplayed?: boolean;
  enabled?: boolean;
}

export const useScreenPerformance = ({
  screenId,
  contentReady,
  isEmpty,
  isLoading,
  fullyDisplayed,
  enabled = true,
}: UseScreenPerformanceConfig): void => {
  // Capture a single mount timestamp so TTC and TTFD share the same start,
  // guaranteeing TTFD duration >= TTC duration (both measure from mount).
  const [mountTime] = useState(() => Date.now());

  const ttcTraceId = useRef(uuidv4());
  const ttcStarted = useRef(false);
  const ttcEnded = useRef(false);

  const ttfdTraceId = useRef(uuidv4());
  const ttfdStarted = useRef(false);
  const ttfdEnded = useRef(false);

  const fetchTraceId = useRef(uuidv4());
  const fetchStarted = useRef(false);
  const fetchEnded = useRef(false);
  const prevIsLoading = useRef<boolean | undefined>(undefined);

  const traceContentState = isEmpty ? 'empty' : 'filled';
  const effectiveFullyDisplayed = fullyDisplayed ?? contentReady;

  useRenderStormMonitor({
    id: screenId,
    category: TraceOperation.OnboardingScreenPerformance,
    entityLabel: 'screen',
    breadcrumbData: { screen_id: screenId },
    enabled,
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
      startTime: mountTime,
      tags: getOnboardingPerformanceTags({ screen_id: screenId }),
    });
    ttcStarted.current = true;

    ttfdTraceId.current = uuidv4();
    ttfdEnded.current = false;
    trace({
      name: TraceName.OnboardingScreenFullyDisplayed,
      op: TraceOperation.OnboardingScreenPerformance,
      id: ttfdTraceId.current,
      startTime: mountTime,
      tags: getOnboardingPerformanceTags({ screen_id: screenId }),
      data: { perf_fix: 'ttfd-v1' },
    });
    ttfdStarted.current = true;

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
      if (ttfdStarted.current && !ttfdEnded.current) {
        endTrace({
          name: TraceName.OnboardingScreenFullyDisplayed,
          id: ttfdTraceId.current,
          data: {
            success: false,
            reason: 'unmounted',
            screen_id: screenId,
          },
        });
        ttfdStarted.current = false;
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
  }, [enabled, screenId, mountTime]);

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
    if (
      enabled &&
      effectiveFullyDisplayed &&
      ttfdStarted.current &&
      !ttfdEnded.current
    ) {
      endTrace({
        name: TraceName.OnboardingScreenFullyDisplayed,
        id: ttfdTraceId.current,
        data: {
          success: true,
          screen_id: screenId,
        },
      });
      ttfdEnded.current = true;
    }
  }, [enabled, effectiveFullyDisplayed, screenId]);

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
