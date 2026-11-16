export interface SocialFeedListState {
  /** Placeholder posts while the first page loads. */
  showSkeleton: boolean;
  /** "No trades yet" once a load finished with nothing to show. */
  showEmpty: boolean;
  /**
   * The full-screen retry. A failed next page is not passed in as `error`;
   * that case is the inline load-more notice instead.
   */
  showRetry: boolean;
}

/** Which feed state to show around the posts. */
export const getSocialFeedListState = ({
  postCount,
  isLoading,
  error,
}: {
  postCount: number;
  isLoading: boolean;
  error: string | null;
}): SocialFeedListState => ({
  showSkeleton: isLoading && postCount === 0,
  showEmpty: !isLoading && !error && postCount === 0,
  showRetry: Boolean(error),
});
