import { Box, BoxAlignItems } from '@metamask/design-system-react-native';
import React from 'react';
import { ActivityIndicator } from 'react-native';
import type { SocialFeedListState } from '../utils/getSocialFeedListState';
import SocialFeedEmpty from './SocialFeedEmpty';
import SocialFeedError from './SocialFeedError';
import SocialFeedLoadMoreError from './SocialFeedLoadMoreError';
import SocialFeedSkeleton from './SocialFeedSkeleton';
import { SOCIAL_FEED_NEXT_PAGE_TEST_ID } from './SocialFeedStates.testIds';

export interface SocialFeedPlaceholderProps {
  state: SocialFeedListState;
  /** Placeholder posts to show; defaults to the skeleton's own count. */
  skeletonCount?: number;
  /** Replaces the default empty line. */
  emptyState?: React.ReactNode;
}

/** What stands in for the posts while there are none: skeleton or empty. */
export const SocialFeedPlaceholder: React.FC<SocialFeedPlaceholderProps> = ({
  state,
  skeletonCount,
  emptyState,
}) => (
  <>
    {state.showSkeleton ? <SocialFeedSkeleton count={skeletonCount} /> : null}
    {state.showEmpty ? (emptyState ?? <SocialFeedEmpty />) : null}
  </>
);

export interface SocialFeedFooterProps {
  state: SocialFeedListState;
  isFetchingNextPage: boolean;
  /** True when the latest next-page fetch failed and earlier rows are showing. */
  isLoadMoreError?: boolean;
  /** Refetches from the first page after a failed first load. */
  onRetry: () => void;
  /** Retries only the page that failed. */
  onRetryLoadMore?: () => void;
}

/** What follows the posts: a retry after a failure, then the page spinner. */
export const SocialFeedFooter: React.FC<SocialFeedFooterProps> = ({
  state,
  isFetchingNextPage,
  isLoadMoreError = false,
  onRetry,
  onRetryLoadMore,
}) => (
  <>
    {isLoadMoreError && !isFetchingNextPage ? (
      <SocialFeedLoadMoreError onRetry={onRetryLoadMore ?? onRetry} />
    ) : null}
    {state.showRetry && !isLoadMoreError ? (
      <SocialFeedError onRetry={onRetry} />
    ) : null}
    {isFetchingNextPage ? (
      <Box
        alignItems={BoxAlignItems.Center}
        twClassName="py-2"
        testID={SOCIAL_FEED_NEXT_PAGE_TEST_ID}
      >
        <ActivityIndicator size="small" />
      </Box>
    ) : null}
  </>
);
