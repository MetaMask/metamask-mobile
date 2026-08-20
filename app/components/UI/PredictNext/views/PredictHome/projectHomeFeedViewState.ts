import { PredictError } from '../../errors';
import type { PredictEvent, PredictVenueStatus } from '../../types';

export const HOME_FEED_LOAD_FAILED_MESSAGE = 'Predictions could not be loaded.';
export const HOME_FEED_EMPTY_MESSAGE = 'No predictions yet.';
export const HOME_FEED_UNAVAILABLE_MESSAGE = 'Predictions are unavailable.';

export type HomeFeedFooterKind = 'none' | 'loading' | 'retry';

export type HomeFeedBlockingState =
  | { kind: 'none' }
  | { kind: 'loading' }
  | {
      kind: 'action_failed';
      category: 'action_failed';
      message: string;
      showRetry: boolean;
    }
  | {
      kind: 'empty';
      category: 'empty_state';
      message: string;
      showRetry: false;
    }
  | {
      kind: 'unavailable';
      category: 'unavailable';
      message: string;
      showRetry: boolean;
    };

export interface HomeFeedViewState {
  events: readonly PredictEvent[];
  blocking: HomeFeedBlockingState;
  footer: HomeFeedFooterKind;
  isMeasurementComplete: boolean;
}

export interface HomeFeedViewStateInput {
  events: readonly PredictEvent[];
  isFeedLoading: boolean;
  isFeedError: boolean;
  feedError: unknown;
  isFetchingNextPage: boolean;
  paginationError: boolean;
  venueStatus?: PredictVenueStatus['status'];
  isVenueStatusLoading: boolean;
  isVenueStatusError: boolean;
  venueStatusError: unknown;
}

export const shouldFetchHomeVenueStatus = ({
  isFeedLoading,
  isFeedError,
  eventCount,
}: {
  isFeedLoading: boolean;
  isFeedError: boolean;
  eventCount: number;
}): boolean => !isFeedLoading && !isFeedError && eventCount === 0;

const fromError = (error: unknown): HomeFeedBlockingState => {
  if (error instanceof PredictError) {
    if (error.category === 'unavailable') {
      return {
        kind: 'unavailable',
        category: 'unavailable',
        message: error.message,
        showRetry: error.recoverable,
      };
    }

    if (error.category === 'empty_state') {
      return {
        kind: 'empty',
        category: 'empty_state',
        message: error.message,
        showRetry: false,
      };
    }

    return {
      kind: 'action_failed',
      category: 'action_failed',
      message: error.message,
      showRetry: error.recoverable,
    };
  }

  return {
    kind: 'action_failed',
    category: 'action_failed',
    message: HOME_FEED_LOAD_FAILED_MESSAGE,
    showRetry: true,
  };
};

/**
 * Projects Feed and Venue Status query snapshots into Home blocking, footer,
 * and measurement view-state. Views render the result; they do not re-encode
 * empty / unavailable / action-failed rules.
 */
export const projectHomeFeedViewState = (
  input: HomeFeedViewStateInput,
): HomeFeedViewState => {
  const {
    events,
    isFeedLoading,
    isFeedError,
    feedError,
    isFetchingNextPage,
    paginationError,
    venueStatus,
    isVenueStatusLoading,
    isVenueStatusError,
    venueStatusError,
  } = input;

  const isMeasurementComplete =
    !isFeedLoading &&
    (events.length > 0 || isFeedError || !isVenueStatusLoading);

  if (events.length > 0) {
    return {
      events,
      blocking: { kind: 'none' },
      footer: isFetchingNextPage
        ? 'loading'
        : paginationError
          ? 'retry'
          : 'none',
      isMeasurementComplete,
    };
  }

  if (isFeedLoading) {
    return {
      events,
      blocking: { kind: 'loading' },
      footer: 'none',
      isMeasurementComplete,
    };
  }

  if (isFeedError) {
    return {
      events,
      blocking: fromError(feedError),
      footer: 'none',
      isMeasurementComplete,
    };
  }

  if (isVenueStatusLoading) {
    return {
      events,
      blocking: { kind: 'loading' },
      footer: 'none',
      isMeasurementComplete,
    };
  }

  if (isVenueStatusError) {
    return {
      events,
      blocking: fromError(venueStatusError),
      footer: 'none',
      isMeasurementComplete,
    };
  }

  if (venueStatus === 'unavailable') {
    return {
      events,
      blocking: {
        kind: 'unavailable',
        category: 'unavailable',
        message: HOME_FEED_UNAVAILABLE_MESSAGE,
        showRetry: true,
      },
      footer: 'none',
      isMeasurementComplete,
    };
  }

  return {
    events,
    blocking: {
      kind: 'empty',
      category: 'empty_state',
      message: HOME_FEED_EMPTY_MESSAGE,
      showRetry: false,
    },
    footer: 'none',
    isMeasurementComplete,
  };
};
