import { Box, SectionDivider } from '@metamask/design-system-react-native';
import React, { Fragment } from 'react';
import type { SocialV1FeedPost } from '../types';
import { getSocialV1FeedEntryDividerTestId } from './SocialV1FeedPostList.testIds';

export interface SocialV1FeedPostListProps {
  posts: SocialV1FeedPost[];
  dividerKeyPrefix: string;
  renderPost: (post: SocialV1FeedPost) => React.ReactNode;
}

/**
 * Renders feed posts with full-width MMDS dividers between entries. Each post
 * sits in horizontal padding; dividers span the screen width.
 */
const SocialV1FeedPostList: React.FC<SocialV1FeedPostListProps> = ({
  posts,
  dividerKeyPrefix,
  renderPost,
}) => (
  <>
    {posts.map((post, index) => (
      <Fragment key={post.id}>
        {index > 0 ? (
          <SectionDivider
            marginVertical={1}
            testID={getSocialV1FeedEntryDividerTestId(
              `${dividerKeyPrefix}-${index}`,
            )}
          />
        ) : null}
        <Box twClassName="px-4">{renderPost(post)}</Box>
      </Fragment>
    ))}
  </>
);

export default SocialV1FeedPostList;
