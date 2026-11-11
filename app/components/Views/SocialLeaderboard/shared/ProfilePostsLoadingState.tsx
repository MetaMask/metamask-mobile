import { Box, SectionDivider } from '@metamask/design-system-react-native';
import React, { Fragment } from 'react';
import SocialFeedPostSkeleton from '../../../UI/SocialFeed/components/SocialFeedPostSkeleton';
import { getSocialV1FeedEntryDividerTestId } from '../../../UI/SocialFeed/components/SocialV1FeedPostList.testIds';

const POST_SKELETON_COUNT = 4;

/**
 * Loading rows for a profile Posts tab. One copy so My Profile and trader
 * profiles do not repeat the same skeleton layout.
 */
const ProfilePostsLoadingState: React.FC = () => (
  <Box paddingTop={4}>
    {Array.from({ length: POST_SKELETON_COUNT }, (_, index) => (
      <Fragment key={`profile-post-skeleton-${index}`}>
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
  </Box>
);

export default ProfilePostsLoadingState;
