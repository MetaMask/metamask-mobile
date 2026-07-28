import { useCallback, useEffect, useMemo, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  endTrace,
  trace,
  TraceName,
  TraceOperation,
  type TraceValue,
} from '../../util/trace';
import type { OnboardingRiveAnimationId } from './onboardingPerformanceIds';
import { getOnboardingPerformanceTags } from './onboardingPerformanceTags';

interface RiveErrorPayload {
  message: string;
  type?: string;
}

interface UseRivePerformanceConfig {
  animationId: OnboardingRiveAnimationId;
  timeoutMs?: number;
  enabled?: boolean;
}

interface UseRivePerformanceResult {
  riveHandlers: {
    onPlay: () => void;
    onError: (riveError: RiveErrorPayload) => void;
  };
}

const DEFAULT_RIVE_TIMEOUT_MS = 3_000;

const RIVE_TIMEOUT_MS_BY_ANIMATION: Partial<
  Record<OnboardingRiveAnimationId, number>
> = {
  fox_loader: 3_000,
  onboarding_wordmark: 5_000,
  fox_appear: 3_000,
};

/**
 * Measures Rive mount → first `onPlay`, with timeout and error outcomes.
 */
export function useRivePerformance({
  animationId,
  timeoutMs = RIVE_TIMEOUT_MS_BY_ANIMATION[animationId] ??
    DEFAULT_RIVE_TIMEOUT_MS,
  enabled = true,
}: UseRivePerformanceConfig): UseRivePerformanceResult {
  const traceId = useRef(uuidv4());
  const ended = useRef(false);
  const started = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPendingTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const endRiveTrace = useCallback(
    (data: Record<string, TraceValue>) => {
      if (ended.current || !started.current) {
        return;
      }
      clearPendingTimeout();
      endTrace({
        name: TraceName.OnboardingRiveReady,
        id: traceId.current,
        data,
      });
      ended.current = true;
    },
    [clearPendingTimeout],
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }

    traceId.current = uuidv4();
    ended.current = false;
    started.current = true;

    trace({
      name: TraceName.OnboardingRiveReady,
      op: TraceOperation.OnboardingRivePerformance,
      id: traceId.current,
      tags: getOnboardingPerformanceTags({ animation_id: animationId }),
    });

    timeoutRef.current = setTimeout(() => {
      endRiveTrace({
        success: false,
        animation_id: animationId,
        outcome: 'timeout',
      });
    }, timeoutMs);

    return () => {
      clearPendingTimeout();
      if (started.current && !ended.current) {
        endTrace({
          name: TraceName.OnboardingRiveReady,
          id: traceId.current,
          data: {
            success: false,
            reason: 'unmounted',
            animation_id: animationId,
            outcome: 'unmounted',
          },
        });
        ended.current = true;
      }
    };
  }, [animationId, clearPendingTimeout, enabled, endRiveTrace, timeoutMs]);

  const riveHandlers = useMemo(
    () => ({
      onPlay: () => {
        endRiveTrace({
          success: true,
          animation_id: animationId,
          outcome: 'play',
        });
      },
      onError: (riveError: RiveErrorPayload) => {
        endRiveTrace({
          success: false,
          animation_id: animationId,
          outcome: 'error',
          error_type: riveError.type ?? 'unknown',
        });
      },
    }),
    [animationId, endRiveTrace],
  );

  return { riveHandlers };
}
