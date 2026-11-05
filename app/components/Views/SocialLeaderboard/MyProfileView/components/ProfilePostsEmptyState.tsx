import {
  Box,
  BoxAlignItems,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React from 'react';
import { strings } from '../../../../../../locales/i18n';
import SocialConversationEmptyState from '../../../../UI/SocialFeed/components/SocialConversationEmptyState';
import { MyProfileViewSelectorsIDs } from '../MyProfileView.testIds';

export interface ProfilePostsEmptyStateProps {
  /** Open, Closed, and a filtered Posts tab pass their own line. */
  message?: string;
}

/**
 * Posts with nothing to show use the illustrated conversation empty state.
 * Open, Closed, and a filtered Posts tab pass their own one-line message.
 */
const ProfilePostsEmptyState: React.FC<ProfilePostsEmptyStateProps> = ({
  message,
}) => {
  if (!message) {
    return (
      <SocialConversationEmptyState
        title={strings('social_leaderboard.my_profile.posts_empty_title')}
        description={strings(
          'social_leaderboard.my_profile.posts_empty_description',
        )}
        testID={MyProfileViewSelectorsIDs.EMPTY_STATE}
      />
    );
  }

  return (
    <Box
      paddingTop={4}
      twClassName="w-full"
      testID={MyProfileViewSelectorsIDs.EMPTY_STATE}
    >
      <Box alignItems={BoxAlignItems.Center} twClassName="px-4 py-8">
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {message}
        </Text>
      </Box>
    </Box>
  );
};

export default ProfilePostsEmptyState;
