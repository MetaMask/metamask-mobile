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
} from '../../../UI/Trending/hooks/searchPerformance';
import {
  ExploreSearchPerformanceState,
  getContentState,
  getQueryLengthBucket,
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
}

export const useExploreSearchPerformance = ({
  query,
  isDebouncing,
  enabledFeeds,
  configuredDebounceMs = DEFAULT_SEARCH_DEBOUNCE_MS,
  entryPoint,
}: UseExploreSearchPerformanceOptions): ExploreSearchPerformance => {
  const [hardwareTier] = useState(() => getHardwareTier());
  const networkTier = useNetworkTier();
  const performanceStateRef = useRef(new ExploreSearchPerformanceState());
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const pendingFeedPaintsRef = useRef(
    new Map<ExploreSearchFeedId, () => void>(),
  );
  const paintedFeedsRef = useRef(new Set<ExploreSearchFeedId>());
  const enabledFeedsRef = useRef(enabledFeeds);
  const isDebouncingRef = useRef(isDebouncing);
  const hardwareTierRef = useRef(hardwareTier);
  const networkTierRef = useRef(networkTier);
  const entryPointRef = useRef(entryPoint);
  const configuredDebounceMsRef = useRef(configuredDebounceMs);

  enabledFeedsRef.current = enabledFeeds;
  isDebouncingRef.current = isDebouncing;
  hardwareTierRef.current = hardwareTier;
  networkTierRef.current = networkTier;
  entryPointRef.current = entryPoint;
  configuredDebounceMsRef.current = configuredDebounceMs;

  const cancelPendingFeedPaints = useCallback(() => {
    pendingFeedPaintsRef.current.forEach((cancel) => cancel());
    pendingFeedPaintsRef.current.clear();
    paintedFeedsRef.current.clear();
  }, []);

  const finishMeasurement = useCallback(
    (completed: boolean, reason?: string) => {
      const endTime = getPerformanceTimestamp();
      const finished = performanceStateRef.current.finish(
        completed,
        reason,
        endTime,
      );

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
        'search.first_input_to_results_ms',
        Math.max(0, endTime - measurement.firstInputAt),
        'millisecond',
      );

      endTrace({
        name: TraceName.ExploreSearchQuery,
        id: measurement.id,
        timestamp: endTime,
        data: {
          success: traceSuccess,
          ...(completed ? { content_state: contentState } : {}),
          ...(reason ? { reason } : {}),
          result_count: finished.resultCount,
          query_length_bucket: getQueryLengthBucket(measurement.query.length),
          input_count: measurement.inputCount,
          collapsed_input_count: Math.max(0, measurement.inputCount - 1),
          tokens_source: measurement.feedSources.get('tokens') ?? 'unknown',
          stocks_source: measurement.feedSources.get('stocks') ?? 'unknown',
          predictions_source:
            measurement.feedSources.get('predictions') ?? 'unknown',
          perps_source: measurement.feedSources.get('perps') ?? 'unknown',
          earn_source: measurement.feedSources.get('earn') ?? 'unknown',
          sites_source: measurement.feedSources.get('sites') ?? 'unknown',
        },
      });
    },
    [cancelPendingFeedPaints],
  );

  const startMeasurement = useCallback(
    (searchQuery: string) => {
      const firstInputAt = getPerformanceTimestamp();
      const id = uuidv4();

      cancelPendingFeedPaints();
      performanceStateRef.current.startGeneration({
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
        const activeMeasurement =
          performanceStateRef.current.currentMeasurement;
        if (activeMeasurement?.id === id && !activeMeasurement.completed) {
          finishMeasurement(false, 'timeout');
        }
      }, SEARCH_PERFORMANCE_TIMEOUT_MS);
    },
    [cancelPendingFeedPaints, finishMeasurement],
  );

  const updateSearchInput = useCallback(
    (searchQuery: string) => {
      const updated = performanceStateRef.current.updateInput(
        searchQuery,
        getPerformanceTimestamp(),
      );
      if (!updated) {
        return;
      }

      cancelPendingFeedPaints();

      const measurement = performanceStateRef.current.currentMeasurement;
      if (!measurement) {
        return;
      }
    },
    [cancelPendingFeedPaints],
  );

  const startRequest = useCallback(
    (
      feedId: ExploreSearchRequestFeedId,
      searchQuery: string,
    ): SearchRequestHandle | undefined => {
      const requestId = uuidv4();
      const startedAt = getPerformanceTimestamp();
      if (
        !performanceStateRef.current.startRequest({
          feedId,
          query: searchQuery,
          requestId,
          startedAt,
        })
      ) {
        return undefined;
      }

      const measurement = performanceStateRef.current.currentMeasurement;
      if (!measurement) {
        return undefined;
      }

      return {
        end: (outcome: SearchRequestOutcome, resultCount = 0) => {
          const completion = performanceStateRef.current.completeRequest({
            requestId,
            outcome,
            pageResultCount: resultCount,
            endedAt: getPerformanceTimestamp(),
          });
          if (!completion) {
            return;
          }

          const currentMeasurement =
            performanceStateRef.current.currentMeasurement;
          if (!currentMeasurement) {
            return;
          }

          if (completion.effectiveOutcome !== 'superseded') {
            setTraceMeasurement(
              {
                name: TraceName.ExploreSearchQuery,
                id: currentMeasurement.id,
              },
              `search.request.${completion.feedId}.ms`,
              completion.durationMs,
              'millisecond',
            );
          }
        },
      };
    },
    [],
  );

  const markCachedResult = useCallback(
    (
      feedId: ExploreSearchRequestFeedId,
      searchQuery: string,
      resultCount: number,
    ) => {
      performanceStateRef.current.markCachedResult(
        feedId,
        searchQuery,
        resultCount,
        getPerformanceTimestamp(),
      );
    },
    [],
  );

  const recordFeedReady = useCallback(
    (
      feedId: ExploreSearchFeedId,
      isReady: boolean,
      loadedResultCount: number,
    ) => {
      const ready = performanceStateRef.current.markFeedReady(
        feedId,
        isReady,
        loadedResultCount,
        getPerformanceTimestamp(),
      );
      if (ready?.status === 'ready') {
        const measurement = performanceStateRef.current.currentMeasurement;
        if (!measurement) {
          return;
        }

        setTraceMeasurement(
          { name: TraceName.ExploreSearchQuery, id: measurement.id },
          `search.feed.${feedId}.ready_ms`,
          ready.readyMs,
          'millisecond',
        );
        if (ready.requestToReadyMs !== undefined) {
          setTraceMeasurement(
            { name: TraceName.ExploreSearchQuery, id: measurement.id },
            `search.feed.${feedId}.request_to_ready_ms`,
            ready.requestToReadyMs,
            'millisecond',
          );
          setTraceMeasurement(
            { name: TraceName.ExploreSearchQuery, id: measurement.id },
            `search.feed.${feedId}.request_to_commit_ms`,
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
          pendingFeedPaintsRef.current.delete(feedId);
          const currentMeasurement =
            performanceStateRef.current.currentMeasurement;
          if (
            !currentMeasurement ||
            currentMeasurement.id !== generationId ||
            currentMeasurement.completed
          ) {
            return;
          }

          const paintedAt = getPerformanceTimestamp();
          const paintedMs = Math.max(
            0,
            paintedAt - currentMeasurement.firstInputAt,
          );
          setTraceMeasurement(
            { name: TraceName.ExploreSearchQuery, id: generationId },
            `search.feed.${feedId}.painted_ms`,
            paintedMs,
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
          paintedFeedsRef.current.add(feedId);

          const allFeedsPainted =
            enabledFeedsRef.current.length > 0 &&
            enabledFeedsRef.current.every((enabledFeed) =>
              paintedFeedsRef.current.has(enabledFeed),
            );
          if (
            allFeedsPainted &&
            performanceStateRef.current.isComplete(
              enabledFeedsRef.current,
              isDebouncingRef.current,
            )
          ) {
            finishMeasurement(true);
          }
        };

        const cancelPaint = scheduleAfterPaint(recordPaintedFeed);
        const currentMeasurement =
          performanceStateRef.current.currentMeasurement;
        if (
          currentMeasurement?.id === generationId &&
          !currentMeasurement.completed &&
          !paintedFeedsRef.current.has(feedId)
        ) {
          pendingFeedPaintsRef.current.set(feedId, cancelPaint);
        }
      }
    },
    [finishMeasurement],
  );

  const markFeedReady = useCallback(
    (
      feedId: ExploreSearchFeedId,
      isReady: boolean,
      loadedResultCount: number,
    ) => {
      if (!isReady) {
        const cancelPaint = pendingFeedPaintsRef.current.get(feedId);
        cancelPaint?.();
        pendingFeedPaintsRef.current.delete(feedId);
        paintedFeedsRef.current.delete(feedId);
      }

      recordFeedReady(feedId, isReady, loadedResultCount);
    },
    [recordFeedReady],
  );

  useEffect(() => {
    const searchQuery = query.trim();
    const activeMeasurement = performanceStateRef.current.currentMeasurement;

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
    isDebouncing,
    query,
    startMeasurement,
    updateSearchInput,
  ]);

  useEffect(() => {
    if (isDebouncing) {
      return;
    }

    const debounceMs = performanceStateRef.current.markDebounce(
      getPerformanceTimestamp(),
    );
    const activeMeasurement = performanceStateRef.current.currentMeasurement;

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
  }, [isDebouncing, query]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') {
        finishMeasurement(false, 'backgrounded');
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

  const tokens = useMemo<SearchRequestPerformance>(
    () => ({
      startRequest: (searchQuery) => startRequest('tokens', searchQuery),
    }),
    [startRequest],
  );
  const stocks = useMemo<SearchRequestPerformance>(
    () => ({
      startRequest: (searchQuery) => startRequest('stocks', searchQuery),
    }),
    [startRequest],
  );
  const predictions = useMemo<SearchRequestPerformance>(
    () => ({
      startRequest: (searchQuery) => startRequest('predictions', searchQuery),
    }),
    [startRequest],
  );

  return useMemo(
    () => ({
      tokens: {
        ...tokens,
        markCachedResult: (searchQuery: string, resultCount: number) =>
          markCachedResult('tokens', searchQuery, resultCount),
      },
      stocks: {
        ...stocks,
        markCachedResult: (searchQuery: string, resultCount: number) =>
          markCachedResult('stocks', searchQuery, resultCount),
      },
      predictions: {
        ...predictions,
        markCachedResult: (searchQuery: string, resultCount: number) =>
          markCachedResult('predictions', searchQuery, resultCount),
      },
      markFeedReady,
    }),
    [markCachedResult, markFeedReady, predictions, stocks, tokens],
  );
};
