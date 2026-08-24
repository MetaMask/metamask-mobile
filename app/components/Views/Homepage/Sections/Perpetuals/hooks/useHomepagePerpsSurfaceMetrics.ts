import { useCallback, useEffect, useRef, type RefObject } from 'react';
import type { View } from 'react-native';
import performance from 'react-native-performance';
import { v4 as uuidv4 } from 'uuid';
import { DevLogger } from '../../../../../../core/SDKConnect/utils/DevLogger';
import useSectionViewportVisible from '../../../hooks/useSectionViewportVisible';
import {
  subscribeToPerpsLoadingSession,
  type PerpsLoadingLifecycle,
} from '../../../../../UI/Perps/utils/perpsLoadingSession';

type HomepagePerpsContentVariant =
  | 'positions_and_orders'
  | 'positions'
  | 'orders'
  | 'pills'
  | 'trending'
  | 'error';

interface UseHomepagePerpsSurfaceMetricsOptions {
  sectionRef: RefObject<View | null>;
  sessionId?: string;
  lifecycle: PerpsLoadingLifecycle;
  contentVariant: HomepagePerpsContentVariant;
  contentReady: boolean;
  hasError: boolean;
  resolvedSource: string;
}

interface ActiveDemand {
  id: string;
  sessionId: string;
  startedAtMs: number;
  lifecycle: PerpsLoadingLifecycle;
  dataReadyAtDemand: boolean;
}

type SurfaceStage =
  | 'surface_demand'
  | 'surface_initial_ui_recorded'
  | 'surface_resolved_recorded'
  | 'surface_live_recorded';

const logSurfaceStage = (
  stage: SurfaceStage,
  demand: ActiveDemand,
  detail: Record<string, string | number | boolean> = {},
) => {
  const now = performance.now();
  DevLogger.log(
    `[PerpsPerf] ${JSON.stringify({
      stage,
      demand_id: demand.id,
      perps_session_id: demand.sessionId,
      lifecycle: demand.lifecycle,
      monotonic_ms: Number(now.toFixed(3)),
      ...(stage === 'surface_demand'
        ? {}
        : {
            frame_checkpoint_monotonic_ms: Number(now.toFixed(3)),
            duration_ms: Number((now - demand.startedAtMs).toFixed(3)),
          }),
      ...detail,
    })}`,
  );
};

/**
 * Emits recipe-only Homepage surface boundaries after native frame checkpoints.
 * Existing Homepage TTC/DFD traces keep sole ownership of production timing.
 */
export function useHomepagePerpsSurfaceMetrics({
  sectionRef,
  sessionId,
  lifecycle,
  contentVariant,
  contentReady,
  hasError,
  resolvedSource,
}: UseHomepagePerpsSurfaceMetricsOptions) {
  const { isVisible, onLayout } = useSectionViewportVisible(sectionRef);
  const activeDemandRef = useRef<ActiveDemand | undefined>(undefined);
  const contentReadyRef = useRef(contentReady);
  const contentVariantRef = useRef(contentVariant);
  const hasErrorRef = useRef(hasError);
  const resolvedSourceRef = useRef(resolvedSource);
  const isVisibleRef = useRef(isVisible);
  const finishedSessionsRef = useRef(new Set<string>());
  const recordedStagesRef = useRef(new Set<SurfaceStage>());
  const frameIdsRef = useRef(new Set<number>());
  contentReadyRef.current = contentReady;
  contentVariantRef.current = contentVariant;
  hasErrorRef.current = hasError;
  resolvedSourceRef.current = resolvedSource;
  isVisibleRef.current = isVisible;

  const afterNextPaint = useCallback((callback: () => void) => {
    let first = 0;
    first = requestAnimationFrame(() => {
      frameIdsRef.current.delete(first);
      let second = 0;
      second = requestAnimationFrame(() => {
        frameIdsRef.current.delete(second);
        callback();
      });
      frameIdsRef.current.add(second);
    });
    frameIdsRef.current.add(first);
  }, []);

  const recordAfterPaint = useCallback(
    (stage: Exclude<SurfaceStage, 'surface_demand'>) => {
      const demand = activeDemandRef.current;
      if (!demand || recordedStagesRef.current.has(stage)) {
        return;
      }
      recordedStagesRef.current.add(stage);
      afterNextPaint(() => {
        if (
          !isVisibleRef.current ||
          activeDemandRef.current?.id !== demand.id
        ) {
          return;
        }
        logSurfaceStage(stage, demand, {
          content_variant: contentVariantRef.current,
          source: resolvedSourceRef.current,
          ...(stage === 'surface_resolved_recorded' ||
          stage === 'surface_live_recorded'
            ? { data_ready_at_demand: demand.dataReadyAtDemand }
            : {}),
          ...(stage === 'surface_live_recorded'
            ? { fresh_for_lifecycle: true }
            : {}),
        });
      });
    },
    [afterNextPaint],
  );

  const recordResolvedAndLive = useCallback(() => {
    const demand = activeDemandRef.current;
    if (!demand || !contentReadyRef.current) {
      return;
    }
    recordAfterPaint('surface_resolved_recorded');
    if (
      !hasErrorRef.current &&
      finishedSessionsRef.current.has(demand.sessionId)
    ) {
      recordAfterPaint('surface_live_recorded');
    }
  }, [recordAfterPaint]);

  useEffect(
    () =>
      subscribeToPerpsLoadingSession((update) => {
        if (update.type === 'finished') {
          finishedSessionsRef.current.add(update.context.id);
          recordResolvedAndLive();
        } else if (update.type === 'cancelled' || update.type === 'timed_out') {
          finishedSessionsRef.current.delete(update.context.id);
        }
      }),
    [recordResolvedAndLive],
  );

  useEffect(() => {
    if (!isVisible || !sessionId) {
      activeDemandRef.current = undefined;
      recordedStagesRef.current.clear();
      return;
    }
    if (activeDemandRef.current?.sessionId === sessionId) {
      return;
    }

    const demand = {
      id: uuidv4(),
      sessionId,
      startedAtMs: performance.now(),
      lifecycle,
      dataReadyAtDemand: contentReadyRef.current,
    };
    const sessionAlreadyFinished = finishedSessionsRef.current.has(sessionId);
    finishedSessionsRef.current.clear();
    if (sessionAlreadyFinished) {
      finishedSessionsRef.current.add(sessionId);
    }
    activeDemandRef.current = demand;
    recordedStagesRef.current.clear();
    recordedStagesRef.current.add('surface_demand');
    logSurfaceStage('surface_demand', demand);
    recordAfterPaint('surface_initial_ui_recorded');
    recordResolvedAndLive();
  }, [
    isVisible,
    lifecycle,
    recordAfterPaint,
    recordResolvedAndLive,
    sessionId,
  ]);

  useEffect(() => {
    recordResolvedAndLive();
  }, [contentReady, recordResolvedAndLive]);

  useEffect(
    () => () => {
      frameIdsRef.current.forEach((id) => cancelAnimationFrame(id));
      frameIdsRef.current.clear();
    },
    [],
  );

  return { onLayout };
}
