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
import { strings } from '../../../../../../../locales/i18n';
import type { SocialV1FeedTab } from '../types';
import { SOCIAL_V1_FEED_EMPTY_STATE_TEST_ID } from './SocialV1FeedEmptyState.testIds';

type SocialV1EmptyStateTab = SocialV1FeedTab | 'liveTrades';

export interface SocialV1FeedEmptyStateProps {
  /** Which Social V1 tab has no content. */
  tab: SocialV1EmptyStateTab;
}

/**
 * Empty state for a Social V1 tab whose feed loaded with no content.
 * Same icon layout as the V0 feed empty state, with surface-specific copy.
 */
const SocialV1FeedEmptyState: React.FC<SocialV1FeedEmptyStateProps> = ({
  tab,
}) => {
  const isFollowing = tab === 'following';

  return (
    <Box
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Center}
      twClassName="w-full px-8 py-16 gap-3"
      testID={SOCIAL_V1_FEED_EMPTY_STATE_TEST_ID}
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
        {strings(`social_leaderboard.feed.v1_empty.${tab}.title`)}
      </Text>
      <Text
        variant={TextVariant.BodyMd}
        color={TextColor.TextAlternative}
        twClassName="text-center"
      >
        {strings(`social_leaderboard.feed.v1_empty.${tab}.description`)}
      </Text>
    </Box>
  );
};

export default SocialV1FeedEmptyState;
