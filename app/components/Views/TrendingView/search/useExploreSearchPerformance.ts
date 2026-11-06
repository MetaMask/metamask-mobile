import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { v4 as uuidv4 } from 'uuid';
import { useNetworkTier } from '../../../../hooks/useNetworkTier';
import { getHardwareTier } from '../../../../util/deviceCapability';
import {
  endTrace,
  getPerformanceTimestamp,
  setTraceMeasurement,
  trace,
  TraceName,
  TraceOperation,
} from '../../../../util/trace';
import type {
  SearchRequestHandle,
  SearchRequestOutcome,
  SearchRequestPerformance,
} from '../../../../util/searchPerformance';
import {
  ExploreSearchPerformanceState,
  getContentState,
  type ExploreSearchFeedId,
  type ExploreSearchRequestFeedId,
} from './exploreSearchPerformanceState';
import type { SearchEntryPoint } from './analytics';
export type { ExploreSearchFeedId } from './exploreSearchPerformanceState';

const SEARCH_PERFORMANCE_TIMEOUT_MS = 10_000;
const DEFAULT_SEARCH_DEBOUNCE_MS = 200;

const scheduleAfterPaint = (callback: () => void): (() => void) => {
  let cancelled = false;
  let secondFrameId: number | undefined;

  const firstFrameId = requestAnimationFrame(() => {
    if (cancelled) {
      return;
    }
    secondFrameId = requestAnimationFrame(() => {
      if (!cancelled) {
        callback();
      }
    });
  });

  return () => {
    cancelled = true;
    cancelAnimationFrame(firstFrameId);
    if (secondFrameId !== undefined) {
      cancelAnimationFrame(secondFrameId);
    }
  };
};

export interface ExploreSearchPerformance {
  tokens: SearchRequestPerformance;
  stocks: SearchRequestPerformance;
  predictions: SearchRequestPerformance;
  onFocus: () => void;
  onBlur: () => void;
  markFeedReady: (
    feedId: ExploreSearchFeedId,
    isReady: boolean,
    loadedResultCount: number,
  ) => void;
}

interface UseExploreSearchPerformanceOptions {
  query: string;
  isDebouncing: boolean;
  enabledFeeds: ExploreSearchFeedId[];
  configuredDebounceMs?: number;
  entryPoint?: SearchEntryPoint;
  isFocused?: boolean;
}

export const useExploreSearchPerformance = ({
  query,
  isDebouncing,
  enabledFeeds,
  configuredDebounceMs = DEFAULT_SEARCH_DEBOUNCE_MS,
  entryPoint,
  isFocused = true,
}: UseExploreSearchPerformanceOptions): ExploreSearchPerformance => {
  const [hardwareTier] = useState(() => getHardwareTier());
  const networkTier = useNetworkTier();
  const [performanceState] = useState(
    () => new ExploreSearchPerformanceState(),
  );
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const [pendingFeedPaints] = useState(
    () => new Map<ExploreSearchFeedId, () => void>(),
  );
  const [paintedFeeds] = useState(() => new Set<ExploreSearchFeedId>());
  const enabledFeedsRef = useRef(enabledFeeds);
  const isDebouncingRef = useRef(isDebouncing);
  const hardwareTierRef = useRef(hardwareTier);
  const networkTierRef = useRef(networkTier);
  const entryPointRef = useRef(entryPoint);
  const configuredDebounceMsRef = useRef(configuredDebounceMs);
  const queryRef = useRef(query);
  const isFocusedRef = useRef(isFocused);

  enabledFeedsRef.current = enabledFeeds;
  isDebouncingRef.current = isDebouncing;
  hardwareTierRef.current = hardwareTier;
  networkTierRef.current = networkTier;
  entryPointRef.current = entryPoint;
  configuredDebounceMsRef.current = configuredDebounceMs;
  queryRef.current = query;
  isFocusedRef.current = isFocused;

  const cancelPendingFeedPaints = useCallback(() => {
    pendingFeedPaints.forEach((cancel) => cancel());
    pendingFeedPaints.clear();
    paintedFeeds.clear();
  }, [paintedFeeds, pendingFeedPaints]);

  const finishMeasurement = useCallback(
    (completed: boolean, reason?: string) => {
      const endTime = getPerformanceTimestamp();
      const finished = performanceState.finish(reason);

      if (!finished) {
        return;
      }

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = undefined;
      }
      cancelPendingFeedPaints();

      const { measurement } = finished;
      const contentState = getContentState(
        finished.resultCount,
        measurement.errorCount,
      );
      const traceSuccess = completed && measurement.errorCount === 0;

      const traceContext = {
        name: TraceName.ExploreSearchQuery,
        id: measurement.id,
      };
      setTraceMeasurement(
        traceContext,
        'search.input_count',
        measurement.inputCount,
        'none',
      );
      setTraceMeasurement(
        traceContext,
        'search.collapsed_input_count',
        Math.max(0, measurement.inputCount - 1),
        'none',
      );
      setTraceMeasurement(
        traceContext,
        'search.result_count',
        finished.resultCount,
        'none',
      );
      setTraceMeasurement(
        traceContext,
        'search.request_count',
        measurement.requestCount,
        'none',
      );
      setTraceMeasurement(
        traceContext,
        'search.superseded_request_count',
        measurement.supersededRequestCount,
        'none',
      );
      setTraceMeasurement(
        traceContext,
        'search.error_count',
        measurement.errorCount,
        'none',
      );
      setTraceMeasurement(
        traceContext,
        'search.last_input_to_end_ms',
        Math.max(0, endTime - measurement.lastInputAt),
        'millisecond',
      );
      measurement.requestFeedStates.forEach((requestState, feedId) => {
        setTraceMeasurement(
          traceContext,
          `search.request.${feedId}.attempt_count`,
          requestState.attemptCount,
          'none',
        );

        if (
          requestState.firstStartedAt !== undefined &&
          requestState.settledAt !== undefined
        ) {
          setTraceMeasurement(
            traceContext,
            `search.request.${feedId}.ms`,
            Math.max(0, requestState.settledAt - requestState.firstStartedAt),
            'millisecond',
          );
        }
      });
      endTrace({
        name: TraceName.ExploreSearchQuery,
        id: measurement.id,
        timestamp: endTime,
        data: {
          success: traceSuccess,
          ...(completed ? { content_state: contentState } : {}),
          ...(reason ? { reason } : {}),
          result_count: finished.resultCount,
          input_count: measurement.inputCount,
          collapsed_input_count: Math.max(0, measurement.inputCount - 1),
          tokens_search_mode:
            measurement.feedSources.get('tokens') ?? 'unknown',
          stocks_search_mode:
            measurement.feedSources.get('stocks') ?? 'unknown',
          predictions_search_mode:
            measurement.feedSources.get('predictions') ?? 'unknown',
          perps_search_mode: measurement.feedSources.get('perps') ?? 'unknown',
          earn_search_mode: measurement.feedSources.get('earn') ?? 'unknown',
          sites_search_mode: measurement.feedSources.get('sites') ?? 'unknown',
        },
      });
    },
    [cancelPendingFeedPaints, performanceState],
  );

  const startMeasurement = useCallback(
    (searchQuery: string) => {
      const firstInputAt = getPerformanceTimestamp();
      const id = uuidv4();

      cancelPendingFeedPaints();
      performanceState.startGeneration({
        id,
        query: searchQuery,
        firstInputAt,
      });

      trace({
        name: TraceName.ExploreSearchQuery,
        op: TraceOperation.ExploreSearch,
        id,
        startTime: firstInputAt,
        forceTransaction: true,
        maxLifetimeMs: SEARCH_PERFORMANCE_TIMEOUT_MS,
        tags: {
          feature: 'explore_search',
          hardware_tier: hardwareTierRef.current ?? 'unknown',
          network_tier: networkTierRef.current ?? 'unknown',
        },
        data: {
          enabled_feeds: enabledFeedsRef.current.join(','),
          debounce_configured_ms: configuredDebounceMsRef.current,
          ...(entryPointRef.current
            ? { entry_point: entryPointRef.current }
            : {}),
        },
      });
      timeoutRef.current = setTimeout(() => {
        const activeMeasurement = performanceState.currentMeasurement;
        if (activeMeasurement?.id === id && !activeMeasurement.completed) {
          finishMeasurement(false, 'timeout');
        }
      }, SEARCH_PERFORMANCE_TIMEOUT_MS);
    },
    [cancelPendingFeedPaints, finishMeasurement, performanceState],
  );

  const onFocus = useCallback(() => {
    isFocusedRef.current = true;
    const activeMeasurement = performanceState.currentMeasurement;

    if (
      (!activeMeasurement || activeMeasurement.completed) &&
      queryRef.current.trim()
    ) {
      startMeasurement(queryRef.current.trim());
    }
  }, [performanceState, startMeasurement]);

  const onBlur = useCallback(() => {
    isFocusedRef.current = false;
    const activeMeasurement = performanceState.currentMeasurement;

    if (activeMeasurement && !activeMeasurement.completed) {
      finishMeasurement(false, 'blurred');
    }
  }, [finishMeasurement, performanceState]);

  const updateSearchInput = useCallback(
    (searchQuery: string) => {
      const updated = performanceState.updateInput(
        searchQuery,
        getPerformanceTimestamp(),
      );
      if (!updated) {
        return;
      }

      cancelPendingFeedPaints();
    },
    [cancelPendingFeedPaints, performanceState],
  );

  const startRequest = useCallback(
    (
      feedId: ExploreSearchRequestFeedId,
      searchQuery: string,
    ): SearchRequestHandle | undefined => {
      const requestId = uuidv4();
      const startedAt = getPerformanceTimestamp();
      if (
        !performanceState.startRequest({
          feedId,
          query: searchQuery,
          requestId,
          startedAt,
        })
      ) {
        return undefined;
      }

      return {
        end: (outcome: SearchRequestOutcome) => {
          performanceState.completeRequest({
            requestId,
            outcome,
            endedAt: getPerformanceTimestamp(),
          });
        },
      };
    },
    [performanceState],
  );

  const markCachedResult = useCallback(
    (feedId: ExploreSearchRequestFeedId, searchQuery: string) => {
      performanceState.markCachedResult(
        feedId,
        searchQuery,
        getPerformanceTimestamp(),
      );
    },
    [performanceState],
  );

  const recordFeedReady = useCallback(
    (
      feedId: ExploreSearchFeedId,
      isReady: boolean,
      loadedResultCount: number,
    ) => {
      const ready = performanceState.markFeedReady(
        feedId,
        isReady,
        loadedResultCount,
        getPerformanceTimestamp(),
      );
      if (ready) {
        const measurement = performanceState.currentMeasurement;
        if (!measurement) {
          return;
        }

        setTraceMeasurement(
          { name: TraceName.ExploreSearchQuery, id: measurement.id },
          `search.feed.${feedId}.ready_ms`,
          ready.readyMs,
          'millisecond',
        );
        setTraceMeasurement(
          { name: TraceName.ExploreSearchQuery, id: measurement.id },
          `search.feed.${feedId}.ready_from_last_input_ms`,
          ready.readyFromLastInputMs,
          'millisecond',
        );
        if (ready.requestToReadyMs !== undefined) {
          setTraceMeasurement(
            { name: TraceName.ExploreSearchQuery, id: measurement.id },
            `search.feed.${feedId}.request_to_ready_ms`,
            ready.requestToReadyMs,
            'millisecond',
          );
        }
        const generationId = measurement.id;
        const requestSettledAt =
          ready.source === 'network'
            ? measurement.requestFeedStates.get(
                feedId as ExploreSearchRequestFeedId,
              )?.settledAt
            : undefined;
        const recordPaintedFeed = () => {
          pendingFeedPaints.delete(feedId);
          const currentMeasurement = performanceState.currentMeasurement;
          if (
            !currentMeasurement ||
            currentMeasurement.id !== generationId ||
            currentMeasurement.completed ||
            !isFocusedRef.current
          ) {
            return;
          }

          const paintedAt = getPerformanceTimestamp();
          const paintedMs = Math.max(
            0,
            paintedAt - currentMeasurement.firstInputAt,
          );
          const paintedFromLastInputMs = Math.max(
            0,
            paintedAt - currentMeasurement.lastInputAt,
          );
          setTraceMeasurement(
            { name: TraceName.ExploreSearchQuery, id: generationId },
            `search.feed.${feedId}.painted_ms`,
            paintedMs,
            'millisecond',
          );
          setTraceMeasurement(
            { name: TraceName.ExploreSearchQuery, id: generationId },
            `search.feed.${feedId}.painted_from_last_input_ms`,
            paintedFromLastInputMs,
            'millisecond',
          );
          const requestToPaintedMs =
            requestSettledAt === undefined
              ? undefined
              : Math.max(0, paintedAt - requestSettledAt);
          if (requestToPaintedMs !== undefined) {
            setTraceMeasurement(
              { name: TraceName.ExploreSearchQuery, id: generationId },
              `search.feed.${feedId}.request_to_painted_ms`,
              requestToPaintedMs,
              'millisecond',
            );
          }
          paintedFeeds.add(feedId);

          const allFeedsPainted =
            enabledFeedsRef.current.length > 0 &&
            enabledFeedsRef.current.every((enabledFeed) =>
              paintedFeeds.has(enabledFeed),
            );
          if (
            allFeedsPainted &&
            performanceState.isComplete(
              enabledFeedsRef.current,
              isDebouncingRef.current,
            )
          ) {
            finishMeasurement(true);
          }
        };

        const cancelPaint = scheduleAfterPaint(recordPaintedFeed);
        const currentMeasurement = performanceState.currentMeasurement;
        if (
          currentMeasurement?.id === generationId &&
          !currentMeasurement.completed &&
          !paintedFeeds.has(feedId)
        ) {
          pendingFeedPaints.set(feedId, cancelPaint);
        }
      }
    },
    [finishMeasurement, paintedFeeds, pendingFeedPaints, performanceState],
  );

  const markFeedReady = useCallback(
    (
      feedId: ExploreSearchFeedId,
      isReady: boolean,
      loadedResultCount: number,
    ) => {
      if (!isReady) {
        const cancelPaint = pendingFeedPaints.get(feedId);
        cancelPaint?.();
        pendingFeedPaints.delete(feedId);
        paintedFeeds.delete(feedId);
      }

      recordFeedReady(feedId, isReady, loadedResultCount);
    },
    [paintedFeeds, pendingFeedPaints, recordFeedReady],
  );

  const getCurrentMeasurement = useCallback(
    () => performanceState.currentMeasurement,
    [performanceState],
  );

  useEffect(() => {
    const searchQuery = query.trim();
    const activeMeasurement = getCurrentMeasurement();

    if (!isFocusedRef.current) {
      if (activeMeasurement && !activeMeasurement.completed) {
        finishMeasurement(false, 'blurred');
      }
      return;
    }

    if (!searchQuery) {
      if (activeMeasurement && !activeMeasurement.completed) {
        finishMeasurement(false, 'cleared');
      }
      return;
    }

    if (!activeMeasurement || activeMeasurement.completed) {
      startMeasurement(searchQuery);
      return;
    }

    if (activeMeasurement.query === searchQuery) {
      return;
    }

    if (isDebouncing) {
      updateSearchInput(searchQuery);
      return;
    }

    finishMeasurement(false, 'superseded');
    startMeasurement(searchQuery);
  }, [
    finishMeasurement,
    getCurrentMeasurement,
    isFocused,
    isDebouncing,
    query,
    startMeasurement,
    updateSearchInput,
  ]);

  useEffect(() => {
    if (isDebouncing) {
      return;
    }

    const debounceMs = performanceState.markDebounce(getPerformanceTimestamp());
    const activeMeasurement = getCurrentMeasurement();

    if (debounceMs === undefined || !activeMeasurement) {
      return;
    }

    const debounceOverheadMs = Math.max(
      0,
      debounceMs - configuredDebounceMsRef.current,
    );
    setTraceMeasurement(
      { name: TraceName.ExploreSearchQuery, id: activeMeasurement.id },
      'search.debounce_ms',
      debounceMs,
      'millisecond',
    );
    setTraceMeasurement(
      { name: TraceName.ExploreSearchQuery, id: activeMeasurement.id },
      'search.debounce_configured_ms',
      configuredDebounceMsRef.current,
      'millisecond',
    );
    setTraceMeasurement(
      { name: TraceName.ExploreSearchQuery, id: activeMeasurement.id },
      'search.debounce_overhead_ms',
      debounceOverheadMs,
      'millisecond',
    );
  }, [getCurrentMeasurement, isDebouncing, performanceState, query]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background') {
        finishMeasurement(false, 'backgrounded');
      } else if (nextState === 'inactive') {
        finishMeasurement(false, 'inactive');
      }
    });

    return () => subscription.remove();
  }, [finishMeasurement]);

  useEffect(
    () => () => {
      finishMeasurement(false, 'unmounted');
    },
    [finishMeasurement],
  );

  return useMemo(() => {
    const createFeedPerformance = (
      feedId: ExploreSearchRequestFeedId,
    ): SearchRequestPerformance => ({
      startRequest: (searchQuery) => startRequest(feedId, searchQuery),
      markCachedResult: (searchQuery) => markCachedResult(feedId, searchQuery),
    });

    return {
      tokens: createFeedPerformance('tokens'),
      stocks: createFeedPerformance('stocks'),
      predictions: createFeedPerformance('predictions'),
      onFocus,
      onBlur,
      markFeedReady,
    };
  }, [markCachedResult, markFeedReady, onBlur, onFocus, startRequest]);
};
