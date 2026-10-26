export interface SocialFeedListState {
  /** Placeholder posts while the first page loads. */
  showSkeleton: boolean;
  /** "No trades yet" once a load finished with nothing to show. */
  showEmpty: boolean;
  /** A retry, for a failed first page or a failed next page alike. */
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
