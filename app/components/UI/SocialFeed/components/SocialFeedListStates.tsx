import { Box, BoxAlignItems } from '@metamask/design-system-react-native';
import React from 'react';
import { ActivityIndicator } from 'react-native';
import type { SocialFeedListState } from '../utils/getSocialFeedListState';
import SocialFeedEmpty from './SocialFeedEmpty';
import SocialFeedError from './SocialFeedError';
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
  onRetry: () => void;
}

/** What follows the posts: a retry after a failure, then the page spinner. */
export const SocialFeedFooter: React.FC<SocialFeedFooterProps> = ({
  state,
  isFetchingNextPage,
  onRetry,
}) => (
  <>
    {state.showRetry ? <SocialFeedError onRetry={onRetry} /> : null}
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
