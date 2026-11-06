import type { SearchRequestOutcome } from '../../../../util/searchPerformance';

export type ExploreSearchFeedId =
  | 'tokens'
  | 'perps'
  | 'earn'
  | 'stocks'
  | 'predictions'
  | 'sites';

export type ExploreSearchRequestFeedId = Extract<
  ExploreSearchFeedId,
  'tokens' | 'stocks' | 'predictions'
>;

export type FeedSource = 'network' | 'cache' | 'local_filter';

type RequestFeedStatus =
  | 'not_started'
  | 'pending'
  | 'success'
  | 'error'
  | 'cache';

interface RequestFeedState {
  requestId?: string;
  firstStartedAt?: number;
  settledAt?: number;
  attemptCount: number;
  status: RequestFeedStatus;
}

export interface ActiveSearchMeasurement {
  id: string;
  query: string;
  firstInputAt: number;
  lastInputAt: number;
  inputCount: number;
  debounceMeasured: boolean;
  readyFeeds: Set<ExploreSearchFeedId>;
  resultCounts: Map<ExploreSearchFeedId, number>;
  feedSources: Map<ExploreSearchFeedId, FeedSource>;
  requestFeedStates: Map<ExploreSearchRequestFeedId, RequestFeedState>;
  requests: Map<
    string,
    {
      feedId: ExploreSearchRequestFeedId;
      startedAt: number;
      ended: boolean;
    }
  >;
  requestCount: number;
  supersededRequestCount: number;
  errorCount: number;
  completed: boolean;
}

export interface FeedReadyResult {
  feedId: ExploreSearchFeedId;
  readyMs: number;
  readyFromLastInputMs: number;
  requestToReadyMs?: number;
  source: FeedSource;
}

type EffectiveSearchRequestOutcome = SearchRequestOutcome | 'superseded';

export interface RequestCompletionResult {
  durationMs: number;
  effectiveOutcome: EffectiveSearchRequestOutcome;
  feedId: ExploreSearchRequestFeedId;
}

export interface FinishedMeasurement {
  measurement: ActiveSearchMeasurement;
  resultCount: number;
}

const QUERY_FEED_IDS = new Set<ExploreSearchRequestFeedId>([
  'tokens',
  'stocks',
  'predictions',
]);

const createRequestFeedStates =
  (): ActiveSearchMeasurement['requestFeedStates'] =>
    new Map(
      Array.from(QUERY_FEED_IDS, (feedId) => [
        feedId,
        { status: 'not_started' as const, attemptCount: 0 },
      ]),
    );

export const getTotalResultCount = (
  resultCounts: Map<ExploreSearchFeedId, number>,
): number => {
  let total = 0;

  resultCounts.forEach((count) => {
    total += count;
  });

  return total;
};

export const getContentState = (
  resultCount: number,
  errorCount: number,
): 'results' | 'empty' | 'partial_error' | 'error' => {
  if (errorCount > 0) {
    return resultCount > 0 ? 'partial_error' : 'error';
  }

  return resultCount > 0 ? 'results' : 'empty';
};

export class ExploreSearchPerformanceState {
  private activeMeasurement: ActiveSearchMeasurement | null = null;

  get currentMeasurement(): ActiveSearchMeasurement | null {
    return this.activeMeasurement;
  }

  private updateErrorCount(measurement: ActiveSearchMeasurement): void {
    measurement.errorCount = Array.from(
      measurement.requestFeedStates.values(),
    ).filter(({ status }) => status === 'error').length;
  }

  startGeneration({
    id,
    query,
    firstInputAt,
  }: {
    id: string;
    query: string;
    firstInputAt: number;
  }): void {
    this.activeMeasurement = {
      id,
      query,
      firstInputAt,
      lastInputAt: firstInputAt,
      inputCount: 1,
      debounceMeasured: false,
      readyFeeds: new Set(),
      resultCounts: new Map(),
      feedSources: new Map(),
      requestFeedStates: createRequestFeedStates(),
      requests: new Map(),
      requestCount: 0,
      supersededRequestCount: 0,
      errorCount: 0,
      completed: false,
    };
  }

  updateInput(query: string, timestamp: number): boolean {
    const measurement = this.activeMeasurement;

    if (!measurement || measurement.completed) {
      return false;
    }

    measurement.query = query;
    measurement.lastInputAt = timestamp;
    measurement.inputCount += 1;
    measurement.debounceMeasured = false;
    measurement.readyFeeds.clear();
    measurement.resultCounts.clear();
    measurement.feedSources.clear();
    measurement.requestFeedStates = createRequestFeedStates();
    measurement.errorCount = 0;

    return true;
  }

  startRequest({
    feedId,
    query,
    requestId,
    startedAt,
  }: {
    feedId: ExploreSearchRequestFeedId;
    query: string;
    requestId: string;
    startedAt: number;
  }): boolean {
    const measurement = this.activeMeasurement;
    const requestFeedState = measurement?.requestFeedStates.get(feedId);

    if (!measurement || measurement.completed || !query.trim()) {
      return false;
    }

    if (!requestFeedState) {
      return false;
    }

    requestFeedState.requestId = requestId;
    requestFeedState.firstStartedAt ??= startedAt;
    requestFeedState.attemptCount += 1;
    requestFeedState.settledAt = undefined;
    requestFeedState.status = 'pending';
    this.updateErrorCount(measurement);
    measurement.readyFeeds.delete(feedId);
    measurement.resultCounts.delete(feedId);
    measurement.feedSources.delete(feedId);
    measurement.requests.set(requestId, {
      feedId,
      startedAt,
      ended: false,
    });
    measurement.feedSources.set(feedId, 'network');
    measurement.requestCount += 1;

    return true;
  }

  completeRequest({
    endedAt,
    outcome,
    requestId,
  }: {
    endedAt: number;
    outcome: SearchRequestOutcome;
    requestId: string;
  }): RequestCompletionResult | undefined {
    const request = this.activeMeasurement?.requests.get(requestId);

    if (!request || request.ended) {
      return undefined;
    }

    request.ended = true;
    const measurement = this.activeMeasurement;

    if (!measurement || measurement.completed) {
      return undefined;
    }

    const requestFeedState = measurement.requestFeedStates.get(request.feedId);

    if (!requestFeedState) {
      return undefined;
    }

    const durationMs = Math.max(0, endedAt - request.startedAt);
    const effectiveOutcome =
      requestFeedState.requestId === requestId ? outcome : 'superseded';

    if (effectiveOutcome === 'superseded') {
      measurement.supersededRequestCount += 1;
    } else {
      requestFeedState.settledAt = endedAt;
      requestFeedState.status = effectiveOutcome;
      this.updateErrorCount(measurement);
    }

    return {
      durationMs,
      effectiveOutcome,
      feedId: request.feedId,
    };
  }

  markCachedResult(
    feedId: ExploreSearchRequestFeedId,
    query: string,
    timestamp: number,
  ): boolean {
    const measurement = this.activeMeasurement;
    const requestFeedState = measurement?.requestFeedStates.get(feedId);

    if (
      !measurement ||
      measurement.completed ||
      measurement.query !== query.trim() ||
      !requestFeedState ||
      requestFeedState.status !== 'not_started'
    ) {
      return false;
    }

    requestFeedState.settledAt = timestamp;
    requestFeedState.status = 'cache';
    this.updateErrorCount(measurement);

    return true;
  }

  markFeedReady(
    feedId: ExploreSearchFeedId,
    isReady: boolean,
    loadedResultCount: number,
    timestamp: number,
  ): FeedReadyResult | undefined {
    const measurement = this.activeMeasurement;

    if (!measurement || measurement.completed) {
      return undefined;
    }

    if (!isReady) {
      measurement.readyFeeds.delete(feedId);
      measurement.resultCounts.delete(feedId);
      return undefined;
    }

    const requestFeedState = QUERY_FEED_IDS.has(
      feedId as ExploreSearchRequestFeedId,
    )
      ? measurement.requestFeedStates.get(feedId as ExploreSearchRequestFeedId)
      : undefined;

    if (
      requestFeedState &&
      (requestFeedState.status === 'not_started' ||
        requestFeedState.status === 'pending')
    ) {
      return undefined;
    }

    if (measurement.readyFeeds.has(feedId)) {
      measurement.resultCounts.set(feedId, loadedResultCount);
      return undefined;
    }

    measurement.readyFeeds.add(feedId);
    measurement.resultCounts.set(feedId, loadedResultCount);

    const source: FeedSource = requestFeedState
      ? requestFeedState.status === 'cache'
        ? 'cache'
        : 'network'
      : 'local_filter';
    measurement.feedSources.set(feedId, source);

    const readyMs = Math.max(0, timestamp - measurement.firstInputAt);
    const readyFromLastInputMs = Math.max(
      0,
      timestamp - measurement.lastInputAt,
    );
    const requestToReadyMs =
      requestFeedState?.status === 'success' ||
      requestFeedState?.status === 'error'
        ? Math.max(0, timestamp - (requestFeedState.settledAt ?? timestamp))
        : undefined;

    return {
      feedId,
      readyMs,
      readyFromLastInputMs,
      ...(requestToReadyMs === undefined ? {} : { requestToReadyMs }),
      source,
    };
  }

  markDebounce(timestamp: number): number | undefined {
    const measurement = this.activeMeasurement;

    if (!measurement || measurement.completed || measurement.debounceMeasured) {
      return undefined;
    }

    measurement.debounceMeasured = true;
    return Math.max(0, timestamp - measurement.lastInputAt);
  }

  isComplete(
    enabledFeeds: ExploreSearchFeedId[],
    isDebouncing: boolean,
  ): boolean {
    const measurement = this.activeMeasurement;

    return Boolean(
      measurement &&
        !measurement.completed &&
        !isDebouncing &&
        enabledFeeds.length > 0 &&
        enabledFeeds.every((feedId) => measurement.readyFeeds.has(feedId)),
    );
  }

  finish(reason: string | undefined): FinishedMeasurement | undefined {
    const measurement = this.activeMeasurement;

    if (!measurement || measurement.completed) {
      return undefined;
    }

    measurement.completed = true;
    this.updateErrorCount(measurement);

    return {
      measurement,
      resultCount: getTotalResultCount(measurement.resultCounts),
    };
  }
}
