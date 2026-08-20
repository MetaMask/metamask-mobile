import { PredictError, PredictErrorCode } from '../../errors';
import type {
  PredictEntityId,
  PredictEvent,
  PredictVenueId,
} from '../../types';
import {
  HOME_FEED_EMPTY_MESSAGE,
  HOME_FEED_LOAD_FAILED_MESSAGE,
  HOME_FEED_UNAVAILABLE_MESSAGE,
  projectHomeFeedViewState,
  shouldFetchHomeVenueStatus,
  type HomeFeedViewStateInput,
} from './projectHomeFeedViewState';

const event: PredictEvent = {
  venueId: 'kalshi' as PredictVenueId,
  id: 'event-1' as PredictEntityId,
  title: 'Who wins?',
  markets: [],
};

const idleInput = (
  overrides: Partial<HomeFeedViewStateInput> = {},
): HomeFeedViewStateInput => ({
  events: [],
  isFeedLoading: false,
  isFeedError: false,
  feedError: undefined,
  isFetchingNextPage: false,
  paginationError: false,
  isVenueStatusLoading: false,
  isVenueStatusError: false,
  venueStatusError: undefined,
  ...overrides,
});

describe('shouldFetchHomeVenueStatus', () => {
  it('returns true for an empty successful Feed', () => {
    const result = shouldFetchHomeVenueStatus({
      isFeedLoading: false,
      isFeedError: false,
      eventCount: 0,
    });

    expect(result).toBe(true);
  });

  it('returns false while the Feed is loading', () => {
    const result = shouldFetchHomeVenueStatus({
      isFeedLoading: true,
      isFeedError: false,
      eventCount: 0,
    });

    expect(result).toBe(false);
  });

  it('returns false when the Feed has Events', () => {
    const result = shouldFetchHomeVenueStatus({
      isFeedLoading: false,
      isFeedError: false,
      eventCount: 1,
    });

    expect(result).toBe(false);
  });

  it('returns false when the Feed is in error', () => {
    const result = shouldFetchHomeVenueStatus({
      isFeedLoading: false,
      isFeedError: true,
      eventCount: 0,
    });

    expect(result).toBe(false);
  });
});

describe('projectHomeFeedViewState', () => {
  it('returns loading while the Feed is loading', () => {
    const result = projectHomeFeedViewState(idleInput({ isFeedLoading: true }));

    expect(result.blocking).toEqual({ kind: 'loading' });
    expect(result.isMeasurementComplete).toBe(false);
  });

  it('returns loading while Venue Status is loading for an empty Feed', () => {
    const result = projectHomeFeedViewState(
      idleInput({ isVenueStatusLoading: true }),
    );

    expect(result.blocking).toEqual({ kind: 'loading' });
    expect(result.isMeasurementComplete).toBe(false);
  });

  it('returns action-failed for an untyped Feed error', () => {
    const result = projectHomeFeedViewState(
      idleInput({
        isFeedError: true,
        feedError: new Error('feed failed'),
      }),
    );

    expect(result.blocking).toEqual({
      kind: 'action_failed',
      category: 'action_failed',
      message: HOME_FEED_LOAD_FAILED_MESSAGE,
      showRetry: true,
    });
    expect(result.isMeasurementComplete).toBe(true);
  });

  it('maps a Venue-unavailable PredictError to unavailable', () => {
    const result = projectHomeFeedViewState(
      idleInput({
        isFeedError: true,
        feedError: PredictError.from(PredictErrorCode.VENUE_UNAVAILABLE),
      }),
    );

    expect(result.blocking).toEqual({
      kind: 'unavailable',
      category: 'unavailable',
      message: 'This prediction venue is unavailable.',
      showRetry: true,
    });
  });

  it('maps an empty-state PredictError to empty', () => {
    const result = projectHomeFeedViewState(
      idleInput({
        isFeedError: true,
        feedError: PredictError.from(PredictErrorCode.FEATURE_DISABLED),
      }),
    );

    expect(result.blocking).toEqual({
      kind: 'empty',
      category: 'empty_state',
      message: 'Predictions are not available right now.',
      showRetry: false,
    });
  });

  it('hides retry for a non-recoverable action-failed PredictError', () => {
    const result = projectHomeFeedViewState(
      idleInput({
        isFeedError: true,
        feedError: PredictError.from(PredictErrorCode.INVALID_RESPONSE),
      }),
    );

    expect(result.blocking).toEqual({
      kind: 'action_failed',
      category: 'action_failed',
      message: 'The prediction service returned an invalid response.',
      showRetry: false,
    });
  });

  it('returns action-failed when Venue Status fails on an empty Feed', () => {
    const result = projectHomeFeedViewState(
      idleInput({
        isVenueStatusError: true,
        venueStatusError: new Error('status failed'),
      }),
    );

    expect(result.blocking).toEqual({
      kind: 'action_failed',
      category: 'action_failed',
      message: HOME_FEED_LOAD_FAILED_MESSAGE,
      showRetry: true,
    });
  });

  it('returns empty when Venue Status is available and the Feed is empty', () => {
    const result = projectHomeFeedViewState(
      idleInput({ venueStatus: 'available' }),
    );

    expect(result.blocking).toEqual({
      kind: 'empty',
      category: 'empty_state',
      message: HOME_FEED_EMPTY_MESSAGE,
      showRetry: false,
    });
    expect(result.isMeasurementComplete).toBe(true);
  });

  it('returns empty when Venue Status is degraded and the Feed is empty', () => {
    const result = projectHomeFeedViewState(
      idleInput({ venueStatus: 'degraded' }),
    );

    expect(result.blocking).toEqual({
      kind: 'empty',
      category: 'empty_state',
      message: HOME_FEED_EMPTY_MESSAGE,
      showRetry: false,
    });
  });

  it('returns unavailable when Venue Status is unavailable and the Feed is empty', () => {
    const result = projectHomeFeedViewState(
      idleInput({ venueStatus: 'unavailable' }),
    );

    expect(result.blocking).toEqual({
      kind: 'unavailable',
      category: 'unavailable',
      message: HOME_FEED_UNAVAILABLE_MESSAGE,
      showRetry: true,
    });
  });

  it('returns no blocking state and a loading footer while fetching the next page', () => {
    const result = projectHomeFeedViewState(
      idleInput({
        events: [event],
        isFetchingNextPage: true,
      }),
    );

    expect(result.blocking).toEqual({ kind: 'none' });
    expect(result.footer).toBe('loading');
    expect(result.events).toEqual([event]);
    expect(result.isMeasurementComplete).toBe(true);
  });

  it('returns a retry footer when the next page failed', () => {
    const result = projectHomeFeedViewState(
      idleInput({
        events: [event],
        paginationError: true,
      }),
    );

    expect(result.footer).toBe('retry');
  });

  it('prefers Events over Feed errors', () => {
    const result = projectHomeFeedViewState(
      idleInput({
        events: [event],
        isFeedError: true,
        feedError: new Error('stale error'),
      }),
    );

    expect(result.blocking).toEqual({ kind: 'none' });
    expect(result.events).toEqual([event]);
  });
});
