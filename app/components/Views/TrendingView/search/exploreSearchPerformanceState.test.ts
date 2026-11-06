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
        endedAt: 200,
      }),
    ).toEqual({
      durationMs: 100,
      effectiveOutcome: 'success',
      feedId: 'tokens',
    });

    expect(state.markFeedReady('tokens', true, 2, 260)).toEqual({
      feedId: 'tokens',
      readyMs: 260,
      readyFromLastInputMs: 260,
      requestToReadyMs: 60,
      source: 'network',
    });
  });

  it('aggregates a failed retry into the final successful feed outcome', () => {
    const state = new ExploreSearchPerformanceState();

    state.startGeneration({
      id: 'generation-1',
      query: 'eth',
      firstInputAt: 0,
    });
    state.startRequest({
      feedId: 'tokens',
      query: 'eth',
      requestId: 'request-1',
      startedAt: 100,
    });
    state.completeRequest({
      requestId: 'request-1',
      outcome: 'error',
      endedAt: 200,
    });
    state.startRequest({
      feedId: 'tokens',
      query: 'eth',
      requestId: 'request-2',
      startedAt: 300,
    });
    state.completeRequest({
      requestId: 'request-2',
      outcome: 'success',
      endedAt: 500,
    });

    const requestState =
      state.currentMeasurement?.requestFeedStates.get('tokens');
    expect(requestState).toMatchObject({
      firstStartedAt: 100,
      settledAt: 500,
      attemptCount: 2,
      status: 'success',
    });
    expect(state.currentMeasurement?.errorCount).toBe(0);
  });

  it('counts a feed once when all retry attempts fail', () => {
    const state = new ExploreSearchPerformanceState();

    state.startGeneration({
      id: 'generation-1',
      query: 'eth',
      firstInputAt: 0,
    });

    [100, 200, 300].forEach((startedAt, index) => {
      state.startRequest({
        feedId: 'tokens',
        query: 'eth',
        requestId: `request-${index + 1}`,
        startedAt,
      });
      state.completeRequest({
        requestId: `request-${index + 1}`,
        outcome: 'error',
        endedAt: startedAt + 50,
      });
    });

    expect(state.currentMeasurement?.errorCount).toBe(1);
    expect(
      state.currentMeasurement?.requestFeedStates.get('tokens'),
    ).toMatchObject({
      firstStartedAt: 100,
      settledAt: 350,
      attemptCount: 3,
      status: 'error',
    });
  });

  it('matches a normalized request by identity within the active generation', () => {
    const state = new ExploreSearchPerformanceState();

    state.startGeneration({
      id: 'generation-1',
      query: '$laptop',
      firstInputAt: 0,
    });
    state.startRequest({
      feedId: 'tokens',
      query: 'laptop',
      requestId: 'request-1',
      startedAt: 10,
    });

    const completion = state.completeRequest({
      requestId: 'request-1',
      outcome: 'success',
      endedAt: 20,
    });

    expect(completion?.effectiveOutcome).toBe('success');
  });

  it('distinguishes cached query results from local feed results', () => {
    const state = new ExploreSearchPerformanceState();

    state.startGeneration({
      id: 'generation-1',
      query: 'eth',
      firstInputAt: 0,
    });
    expect(state.markCachedResult('tokens', 'other', 20)).toBe(false);
    expect(state.markCachedResult('tokens', 'eth', 20)).toBe(true);
    expect(state.markFeedReady('tokens', true, 2, 30)).toMatchObject({
      source: 'cache',
    });
    expect(state.markFeedReady('perps', true, 1, 40)).toMatchObject({
      source: 'local_filter',
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
        endedAt: 100,
      }),
    ).toMatchObject({
      effectiveOutcome: 'superseded',
      durationMs: 90,
    });

    expect(state.currentMeasurement?.supersededRequestCount).toBe(1);
  });

  it('resets earlier request errors when input changes within a generation', () => {
    const state = new ExploreSearchPerformanceState();

    state.startGeneration({ id: 'generation-1', query: 'e', firstInputAt: 0 });
    state.startRequest({
      feedId: 'tokens',
      query: 'e',
      requestId: 'request-1',
      startedAt: 10,
    });
    state.completeRequest({
      requestId: 'request-1',
      outcome: 'error',
      endedAt: 20,
    });

    expect(state.currentMeasurement?.errorCount).toBe(1);
    state.updateInput('eth', 30);

    expect(state.currentMeasurement?.errorCount).toBe(0);
  });
});
