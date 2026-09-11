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
import type { FeedAudience } from '../types';
import { FeedViewSelectorsIDs } from '../FeedView.testIds';

export interface FeedEmptyStateProps {
  /** Which audience is empty, so we show the right icon + copy. */
  audience?: FeedAudience;
}

/**
 * Empty state for the feed. For the "Following" audience it nudges the user to
 * follow traders; for "All" it's a neutral "no activity yet" message. Both
 * mirror the leaderboard no-results style (illustration + title + description,
 * no CTA).
 */
const FollowingEmptyState: React.FC<FeedEmptyStateProps> = ({
  audience = 'following',
}) => {
  const isFollowing = audience === 'following';
  const copyKey = isFollowing ? 'empty_following' : 'empty_all';

  return (
    <Box
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Center}
      twClassName="flex-1 px-8 py-16 gap-3"
      testID={FeedViewSelectorsIDs.EMPTY_STATE}
    >
      <Icon
        name={isFollowing ? IconName.UserCircle : IconName.Activity}
        size={IconSize.Xl}
        color={IconColor.IconMuted}
      />
      <Text
        variant={TextVariant.HeadingSm}
        fontWeight={FontWeight.Medium}
        color={TextColor.TextDefault}
        twClassName="text-center"
      >
        {strings(`social_leaderboard.feed.${copyKey}.title`)}
      </Text>
      <Text
        variant={TextVariant.BodyMd}
        color={TextColor.TextAlternative}
        twClassName="text-center"
      >
        {strings(`social_leaderboard.feed.${copyKey}.description`)}
      </Text>
    </Box>
  );
};

export default FollowingEmptyState;
