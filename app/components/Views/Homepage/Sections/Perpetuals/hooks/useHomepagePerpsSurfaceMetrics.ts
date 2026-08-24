import { useCallback, useEffect, useRef, type RefObject } from 'react';
import type { View } from 'react-native';
import performance from 'react-native-performance';
import { v4 as uuidv4 } from 'uuid';
import { DevLogger } from '../../../../../../core/SDKConnect/utils/DevLogger';
import useSectionViewportVisible from '../../../hooks/useSectionViewportVisible';
import {
  getPerpsLoadingSessionContext,
  subscribeToPerpsLoadingSession,
  type PerpsLoadingLifecycle,
  type PerpsLoadingSessionContext,
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
  isRendered: boolean;
  isFocused: boolean;
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
  accountGeneration: number;
  contextGeneration: number;
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
      account_generation: demand.accountGeneration,
      context_generation: demand.contextGeneration,
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
  isRendered,
  isFocused,
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
  const isSurfaceVisible = isRendered && isFocused && isVisible;
  const isSurfaceVisibleRef = useRef(isSurfaceVisible);
  const finishedSessionsRef = useRef(new Set<string>());
  const proofContextRef = useRef<PerpsLoadingSessionContext | null>(null);
  const recordedStagesRef = useRef(new Set<SurfaceStage>());
  const frameIdsRef = useRef(new Set<number>());
  contentReadyRef.current = contentReady;
  contentVariantRef.current = contentVariant;
  hasErrorRef.current = hasError;
  resolvedSourceRef.current = resolvedSource;
  isSurfaceVisibleRef.current = isSurfaceVisible;

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
          !isSurfaceVisibleRef.current ||
          activeDemandRef.current?.id !== demand.id
        ) {
          return;
        }
        const isAccountVariant =
          contentVariantRef.current === 'positions' ||
          contentVariantRef.current === 'orders' ||
          contentVariantRef.current === 'positions_and_orders';
        const source =
          stage === 'surface_live_recorded' &&
          isAccountVariant &&
          proofContextRef.current?.connectionGeneration !== undefined
            ? 'fresh_socket'
            : resolvedSourceRef.current;
        logSurfaceStage(stage, demand, {
          content_variant: contentVariantRef.current,
          source,
          ...(stage === 'surface_resolved_recorded' ||
          stage === 'surface_live_recorded'
            ? { data_ready_at_demand: demand.dataReadyAtDemand }
            : {}),
          ...(stage === 'surface_live_recorded'
            ? {
                fresh_for_lifecycle: true,
                ...(proofContextRef.current?.connectionGeneration === undefined
                  ? {}
                  : {
                      connection_generation:
                        proofContextRef.current.connectionGeneration,
                    }),
              }
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
    const currentResolvedSource = resolvedSourceRef.current;
    const isAccountVariant =
      contentVariantRef.current === 'positions' ||
      contentVariantRef.current === 'orders' ||
      contentVariantRef.current === 'positions_and_orders';
    const isFreshForLifecycle = isAccountVariant
      ? proofContextRef.current?.connectionGeneration !== undefined
      : currentResolvedSource === 'terminal_v2' ||
        currentResolvedSource === 'provider';
    if (
      !hasErrorRef.current &&
      isFreshForLifecycle &&
      finishedSessionsRef.current.has(demand.sessionId)
    ) {
      recordAfterPaint('surface_live_recorded');
    }
  }, [recordAfterPaint]);

  const beginDemand = useCallback(
    (
      proofContext: PerpsLoadingSessionContext,
      demandLifecycle: PerpsLoadingLifecycle,
    ) => {
      proofContextRef.current = proofContext;
      const demand = {
        id: uuidv4(),
        sessionId: proofContext.id,
        startedAtMs: performance.now(),
        lifecycle: demandLifecycle,
        dataReadyAtDemand: contentReadyRef.current,
        accountGeneration: proofContext.accountGeneration,
        contextGeneration: proofContext.contextGeneration,
      };
      const sessionAlreadyFinished = finishedSessionsRef.current.has(
        proofContext.id,
      );
      finishedSessionsRef.current.clear();
      if (sessionAlreadyFinished) {
        finishedSessionsRef.current.add(proofContext.id);
      }
      activeDemandRef.current = demand;
      recordedStagesRef.current.clear();
      recordedStagesRef.current.add('surface_demand');
      logSurfaceStage('surface_demand', demand);
      recordAfterPaint('surface_initial_ui_recorded');
      recordResolvedAndLive();
    },
    [recordAfterPaint, recordResolvedAndLive],
  );

  useEffect(
    () =>
      subscribeToPerpsLoadingSession((update) => {
        if (activeDemandRef.current?.sessionId === update.context.id) {
          proofContextRef.current = update.context;
          if (
            update.type === 'lifecycle' &&
            activeDemandRef.current.lifecycle !== update.context.lifecycle
          ) {
            beginDemand(update.context, update.context.lifecycle);
            return;
          }
        }
        if (update.type === 'finished') {
          finishedSessionsRef.current.add(update.context.id);
          recordResolvedAndLive();
        } else if (update.type === 'cancelled' || update.type === 'timed_out') {
          finishedSessionsRef.current.delete(update.context.id);
        }
      }),
    [beginDemand, recordResolvedAndLive],
  );

  useEffect(() => {
    if (!isSurfaceVisible || !sessionId) {
      activeDemandRef.current = undefined;
      recordedStagesRef.current.clear();
      return;
    }
    if (activeDemandRef.current?.sessionId === sessionId) {
      return;
    }

    const proofContext = getPerpsLoadingSessionContext(sessionId);
    if (!proofContext) {
      return;
    }
    beginDemand(proofContext, lifecycle);
  }, [beginDemand, isSurfaceVisible, lifecycle, sessionId]);

  useEffect(() => {
    recordResolvedAndLive();
  }, [contentReady, recordResolvedAndLive, resolvedSource]);

  useEffect(
    () => () => {
      frameIdsRef.current.forEach((id) => cancelAnimationFrame(id));
      frameIdsRef.current.clear();
    },
    [],
  );

  return { onLayout };
}
