import {
  Box,
  BoxAlignItems,
  Spinner,
} from '@metamask/design-system-react-native';
import React from 'react';
import SocialV1FeedEmptyState from '../../SocialV1View/feed/components/SocialV1FeedEmptyState';
import FollowingSuggestions from './FollowingSuggestions';

export const FOLLOWING_EMPTY_LOADING_TEST_ID =
  'social-v1-following-empty-loading';

export type FollowingEmptyMode = 'loading' | 'suggestions' | 'no-posts';

export interface FollowingEmptyContentProps {
  mode: FollowingEmptyMode;
}

/**
 * What the Following tab shows once its feed has loaded with no posts.
 * Suggestions when the viewer follows nobody. Otherwise the quiet line.
 */
const FollowingEmptyContent: React.FC<FollowingEmptyContentProps> = ({
  mode,
}) => {
  if (mode === 'suggestions') {
    return <FollowingSuggestions />;
  }
  if (mode === 'loading') {
    return (
      <Box
        alignItems={BoxAlignItems.Center}
        twClassName="py-12"
        testID={FOLLOWING_EMPTY_LOADING_TEST_ID}
      >
        <Spinner />
      </Box>
    );
  }
  return (
    <Box twClassName="-mt-2">
      <SocialV1FeedEmptyState tab="following" />
    </Box>
  );
};

export default FollowingEmptyContent;
