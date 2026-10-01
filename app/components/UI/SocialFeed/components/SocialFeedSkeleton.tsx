import { Box, SectionDivider } from '@metamask/design-system-react-native';
import React, { Fragment } from 'react';
import SocialFeedPostSkeleton from './SocialFeedPostSkeleton';
import { getSocialV1FeedEntryDividerTestId } from './SocialV1FeedPostList.testIds';

/** Placeholder rows while the first feed page loads (matches V0 feed). */
export const SOCIAL_FEED_SKELETON_DEFAULT_COUNT = 4;

export interface SocialFeedSkeletonProps {
  /** How many placeholder posts to show. */
  count?: number;
}

/**
 * Placeholder posts with the same dividers and padding as
 * `SocialV1FeedPostList`, so the first page replaces them without a shift.
 */
const SocialFeedSkeleton: React.FC<SocialFeedSkeletonProps> = ({
  count = SOCIAL_FEED_SKELETON_DEFAULT_COUNT,
}) => (
  <>
    {Array.from({ length: count }, (_, index) => (
      <Fragment key={`social-feed-skeleton-${index}`}>
        {index > 0 ? (
          <SectionDivider
            marginVertical={1}
            testID={getSocialV1FeedEntryDividerTestId(`loading-${index}`)}
          />
        ) : null}
        <Box twClassName="px-4">
          <SocialFeedPostSkeleton index={index} />
        </Box>
      </Fragment>
    ))}
  </>
);

export default SocialFeedSkeleton;
