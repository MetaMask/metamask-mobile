import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import performance from 'react-native-performance';

import { useScreenTransitionComplete } from '../hooks/useScreenTransitionComplete';
import {
  DEFERRED_RENDER_FRAME_TIMEOUT_MS,
  deferredRenderCompleteMark,
  deferredRenderFirstRenderMark,
} from './constants';
import { scheduleDeferredWork } from './scheduleDeferredWork';
import type {
  UseDeferredRenderOptions,
  UseDeferredRenderResult,
} from './types';

function normalizeStageCount(stages: number | undefined): number {
  if (stages === undefined || !Number.isFinite(stages) || stages < 1) {
    return 1;
  }
  return Math.floor(stages);
}

function initialReleasedStage(enabled: boolean, stageCount: number): number {
  return enabled ? -1 : stageCount - 1;
}

/**
 * Defers expensive work until the screen's opening transition has finished
 * and the next frame (then an idle callback, when available) has run.
 *
 * The transition gate is {@link useScreenTransitionComplete}: `transitionEnd`
 * with `closing: true` is ignored, and a focused screen that never emits the
 * event still opens after `SCREEN_TRANSITION_FALLBACK_MS`. Each stage after
 * the first waits one more frame. A short timeout backs up a frame or idle
 * callback that never runs, so deferred content always mounts.
 *
 * Released stages only move forward. Re-renders do not return them to the
 * placeholder. A new `screenId`, or a remount, starts a new visit.
 *
 * Does not use `InteractionManager.runAfterInteractions`.
 */
export function useDeferredRender({
  screenId,
  stages,
  enabled = true,
  onDeferredComplete,
}: UseDeferredRenderOptions): UseDeferredRenderResult {
  const stageCount = normalizeStageCount(stages);
  const [visitScreenId, setVisitScreenId] = useState(screenId);
  const [releasedStage, setReleasedStage] = useState(() =>
    initialReleasedStage(enabled, stageCount),
  );
  const releasedStageRef = useRef(releasedStage);
  const screenIdRef = useRef(screenId);
  const stageCountRef = useRef(stageCount);
  const enabledRef = useRef(enabled);
  const onCompleteRef = useRef(onDeferredComplete);
  const markedScreenIdRef = useRef<string | null>(null);
  const completedScreenIdRef = useRef<string | null>(null);
  const isTransitionComplete = useScreenTransitionComplete();

  screenIdRef.current = screenId;
  stageCountRef.current = stageCount;
  enabledRef.current = enabled;
  onCompleteRef.current = onDeferredComplete;

  if (visitScreenId !== screenId) {
    const nextStage = initialReleasedStage(enabled, stageCount);
    releasedStageRef.current = nextStage;
    setVisitScreenId(screenId);
    setReleasedStage(nextStage);
  }

  useLayoutEffect(() => {
    if (markedScreenIdRef.current === screenId) {
      return;
    }
    markedScreenIdRef.current = screenId;
    performance.mark(deferredRenderFirstRenderMark(screenId));
  }, [screenId]);

  useEffect(() => {
    let active = true;
    let cancelScheduled: (() => void) | undefined;

    const lastStage = () => stageCountRef.current - 1;

    const completeOnce = () => {
      if (!active) {
        return;
      }
      if (completedScreenIdRef.current === screenIdRef.current) {
        return;
      }
      completedScreenIdRef.current = screenIdRef.current;
      performance.mark(deferredRenderCompleteMark(screenIdRef.current));
      onCompleteRef.current?.();
    };

    const commitStage = (stage: number) => {
      if (!active || stage <= releasedStageRef.current) {
        return;
      }
      releasedStageRef.current = stage;
      setReleasedStage(stage);
    };

    if (!enabledRef.current || releasedStageRef.current >= lastStage()) {
      commitStage(lastStage());
      completeOnce();
      return undefined;
    }

    if (!isTransitionComplete) {
      return undefined;
    }

    const releaseNext = () => {
      if (!active) {
        return;
      }
      const last = lastStage();
      const next = Math.min(releasedStageRef.current + 1, last);
      if (next <= releasedStageRef.current) {
        return;
      }
      commitStage(next);
      if (!active) {
        return;
      }
      if (releasedStageRef.current >= last) {
        completeOnce();
        return;
      }
      cancelScheduled = scheduleDeferredWork(
        releaseNext,
        DEFERRED_RENDER_FRAME_TIMEOUT_MS,
        'frame',
      );
    };

    cancelScheduled = scheduleDeferredWork(
      releaseNext,
      DEFERRED_RENDER_FRAME_TIMEOUT_MS,
      'frame-then-idle',
    );

    return () => {
      active = false;
      cancelScheduled?.();
    };
  }, [enabled, isTransitionComplete, screenId]);

  const isStageReady = useCallback(
    (stage = 0) => releasedStage >= stage,
    [releasedStage],
  );
  const isComplete = releasedStage >= stageCount - 1;

  return useMemo(
    () => ({
      releasedStage,
      isComplete,
      isStageReady,
    }),
    [isComplete, isStageReady, releasedStage],
  );
}
