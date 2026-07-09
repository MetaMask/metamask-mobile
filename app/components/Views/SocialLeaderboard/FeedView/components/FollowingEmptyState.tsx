import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React from 'react';
import { strings } from '../../../../../../locales/i18n';
import { FeedViewSelectorsIDs } from '../FeedView.testIds';

/**
 * Empty state shown when the feed audience is "Following" but the user isn't
 * following anyone yet. Illustration + title + description, no CTA (mirrors the
 * leaderboard no-results style).
 */
const FollowingEmptyState: React.FC = () => (
  <Box
    alignItems={BoxAlignItems.Center}
    justifyContent={BoxJustifyContent.Center}
    twClassName="flex-1 px-8 py-16 gap-3"
    testID={FeedViewSelectorsIDs.EMPTY_STATE}
  >
    <Icon
      name={IconName.UserCircle}
      size={IconSize.Xl}
      color={IconColor.IconMuted}
    />
    <Text
      variant={TextVariant.HeadingSm}
      fontWeight={FontWeight.Medium}
      color={TextColor.TextDefault}
      twClassName="text-center"
    >
      {strings('social_leaderboard.feed.empty_following.title')}
    </Text>
    <Text
      variant={TextVariant.BodyMd}
      color={TextColor.TextAlternative}
      twClassName="text-center"
    >
      {strings('social_leaderboard.feed.empty_following.description')}
    </Text>
  </Box>
);

export default FollowingEmptyState;
