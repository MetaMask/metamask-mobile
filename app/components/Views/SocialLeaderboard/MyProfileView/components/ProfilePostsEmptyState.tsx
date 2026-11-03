import {
  Box,
  BoxAlignItems,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React from 'react';
import { strings } from '../../../../../../locales/i18n';
import { MyProfileViewSelectorsIDs } from '../MyProfileView.testIds';

export interface ProfilePostsEmptyStateProps {
  /** Defaults to "No posts yet". Open and Closed pass their own line. */
  message?: string;
}

/**
 * One centered line for an empty profile tab. The line uses the same type and
 * box as the Open and Closed empty copy.
 */
const ProfilePostsEmptyState: React.FC<ProfilePostsEmptyStateProps> = ({
  message,
}) => (
  <Box
    paddingTop={4}
    twClassName="w-full"
    testID={MyProfileViewSelectorsIDs.EMPTY_STATE}
  >
    <Box alignItems={BoxAlignItems.Center} twClassName="px-4 py-8">
      <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
        {message ?? strings('social_leaderboard.my_profile.empty_title')}
      </Text>
    </Box>
  </Box>
);

export default ProfilePostsEmptyState;
