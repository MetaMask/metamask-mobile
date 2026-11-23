import { getSocialFeedListState } from './getSocialFeedListState';

describe('getSocialFeedListState', () => {
  it('shows the skeleton while the first page loads', () => {
    expect(
      getSocialFeedListState({ postCount: 0, isLoading: true, error: null }),
    ).toEqual({ showSkeleton: true, showEmpty: false, showRetry: false });
  });

  it('shows the empty state once a load returns nothing', () => {
    expect(
      getSocialFeedListState({ postCount: 0, isLoading: false, error: null }),
    ).toEqual({ showSkeleton: false, showEmpty: true, showRetry: false });
  });

  it('shows only the retry when the first page fails', () => {
    expect(
      getSocialFeedListState({ postCount: 0, isLoading: false, error: 'down' }),
    ).toEqual({ showSkeleton: false, showEmpty: false, showRetry: true });
  });

  it('keeps the retry beside loaded posts when a later page fails', () => {
    expect(
      getSocialFeedListState({ postCount: 3, isLoading: false, error: 'down' }),
    ).toEqual({ showSkeleton: false, showEmpty: false, showRetry: true });
  });

  it('shows no state around loaded posts', () => {
    expect(
      getSocialFeedListState({ postCount: 3, isLoading: false, error: null }),
    ).toEqual({ showSkeleton: false, showEmpty: false, showRetry: false });
  });
});
