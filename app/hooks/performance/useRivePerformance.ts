import { useCallback, useEffect, useMemo, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  endTrace,
  trace,
  TraceName,
  TraceOperation,
  type TraceValue,
} from '../../util/trace';
import {
  getOnboardingPerformanceTags,
  type OnboardingRiveAnimationId,
} from './onboardingPerformanceIds';

interface RiveErrorPayload {
  message: string;
  type?: string;
}

interface UseRivePerformanceConfig {
  animationId: OnboardingRiveAnimationId;
  timeoutMs?: number;
  enabled?: boolean;
}

const DEFAULT_RIVE_TIMEOUT_MS = 3_000;

export function useRivePerformance({
  animationId,
  timeoutMs = DEFAULT_RIVE_TIMEOUT_MS,
  enabled = true,
}: UseRivePerformanceConfig): {
  riveHandlers: {
    onPlay: () => void;
    onError: (riveError: RiveErrorPayload) => void;
  };
} {
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
      endRiveTrace({
        success: false,
        reason: 'unmounted',
        animation_id: animationId,
        outcome: 'unmounted',
      });
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
