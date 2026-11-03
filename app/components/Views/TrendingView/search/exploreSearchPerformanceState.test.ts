import { ExploreSearchPerformanceState } from './exploreSearchPerformanceState';

describe('ExploreSearchPerformanceState', () => {
  it('waits for a query request to settle before accepting feed readiness', () => {
    const state = new ExploreSearchPerformanceState();

    state.startGeneration({
      id: 'generation-1',
      query: 'eth',
      firstInputAt: 0,
    });

    expect(state.markFeedReady('tokens', true, 10, 50)).toBeUndefined();

    expect(
      state.startRequest({
        feedId: 'tokens',
        query: 'eth',
        requestId: 'request-1',
        startedAt: 100,
      }),
    ).toBe(true);
    expect(state.markFeedReady('tokens', true, 10, 150)).toBeUndefined();

    expect(
      state.completeRequest({
        requestId: 'request-1',
        outcome: 'success',
        pageResultCount: 2,
        endedAt: 200,
      }),
    ).toEqual({
      durationMs: 100,
      effectiveOutcome: 'success',
      feedId: 'tokens',
      pageResultCount: 2,
    });

    expect(state.markFeedReady('tokens', true, 2, 260)).toEqual({
      status: 'ready',
      feedId: 'tokens',
      loadedResultCount: 2,
      readyMs: 260,
      requestToReadyMs: 60,
      source: 'network',
    });
  });

  it('distinguishes cached query results from local feed results', () => {
    const state = new ExploreSearchPerformanceState();

    state.startGeneration({
      id: 'generation-1',
      query: 'eth',
      firstInputAt: 0,
    });
    expect(state.markCachedResult('tokens', 'eth', 2, 20)).toBe(true);
    expect(state.markFeedReady('tokens', true, 2, 30)).toMatchObject({
      source: 'cache',
    });
    expect(state.markFeedReady('perps', true, 1, 40)).toMatchObject({
      source: 'local',
    });
  });

  it('counts a request as superseded when input changes within a generation', () => {
    const state = new ExploreSearchPerformanceState();

    state.startGeneration({ id: 'generation-1', query: 'e', firstInputAt: 0 });
    state.startRequest({
      feedId: 'tokens',
      query: 'e',
      requestId: 'request-1',
      startedAt: 10,
    });
    expect(state.updateInput('eth', 50)).toBe(true);

    expect(
      state.completeRequest({
        requestId: 'request-1',
        outcome: 'success',
        pageResultCount: 1,
        endedAt: 100,
      }),
    ).toMatchObject({
      effectiveOutcome: 'superseded',
      durationMs: 90,
    });

    expect(state.currentMeasurement?.supersededRequestCount).toBe(1);
  });
});
