import React, { useCallback } from 'react';
import {
  AvatarTokenSize,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Button,
  ButtonSize,
  ButtonVariant,
  Icon,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { Position } from '@metamask/social-controllers';
import { strings } from '../../../../../../locales/i18n';
import PositionTokenAvatar from '../../../../UI/SocialFeed/components/PositionTokenAvatar';
import TraderAvatar from '../../../../UI/SocialFeed/components/TraderAvatar';
import { MOCK_MARKER } from '../../../../UI/SocialFeed/mockMarker';
import { useSocialFeedSurface } from '../../../../UI/SocialFeed/SocialFeedSurface';
import type { SocialV1FeedAuthor } from '../../../../UI/SocialFeed/types';
import {
  resolveTraderCohort,
  traderCohortEmoji,
} from '../../../../UI/SocialFeed/utils/traderStats';
import { useFollowToggle } from '../../../../hooks/useFollowToggle';
import { useFollowWithNotificationSetup } from '../../hooks/useFollowWithNotificationSetup';
import { PositionDetailsSheetSelectorsIDs } from '../PositionDetailsSheet.testIds';

const AVATAR_GROUP_SIZE = 40;
const AVATAR_SIZE = 24;
const TRADER_AVATAR_RING = 2;

export interface PositionSheetHeaderProps {
  author: SocialV1FeedAuthor;
  position: Position | undefined;
  /** The viewer's own post: no Follow button. */
  isOwnPost: boolean;
}

const PositionSheetHeader = ({
  author,
  position,
  isOwnPost,
}: PositionSheetHeaderProps) => {
  const tw = useTailwind();
  const { showMockedFields } = useSocialFeedSurface();
  const { isFollowing, toggleFollow } = useFollowToggle(author.id);
  const { followWithSetup } = useFollowWithNotificationSetup();
  const cohortEmoji = traderCohortEmoji(resolveTraderCohort(author.pnl30d));

  const handleFollowPress = useCallback(
    () =>
      followWithSetup(isFollowing, () =>
        toggleFollow({
          source: 'trader_feed',
          traderAddress: author.address ?? '',
          traderUsername: author.username,
          traderAvatarUri: author.avatarUri,
        }),
      ),
    [followWithSetup, isFollowing, toggleFollow, author],
  );

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      gap={3}
      twClassName="px-4 py-2 border-b border-muted"
      testID={PositionDetailsSheetSelectorsIDs.HEADER}
    >
      <Box style={{ width: AVATAR_GROUP_SIZE, height: AVATAR_GROUP_SIZE }}>
        {position ? (
          <Box twClassName="absolute top-0 right-0">
            <PositionTokenAvatar
              position={position}
              size={AvatarTokenSize.Sm}
            />
          </Box>
        ) : null}
        <Box
          twClassName="absolute bottom-0 left-0 rounded-full border-default bg-default"
          style={{ borderWidth: TRADER_AVATAR_RING }}
        >
          <TraderAvatar
            imageUrl={author.avatarUri}
            address={author.id}
            size={AVATAR_SIZE}
            recyclingKey={author.id}
          />
        </Box>
      </Box>

      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={1}
        twClassName="flex-1 min-w-0"
      >
        <Text
          variant={TextVariant.HeadingSm}
          numberOfLines={1}
          twClassName="shrink"
          testID={PositionDetailsSheetSelectorsIDs.TITLE}
        >
          {strings('social_leaderboard.position_sheet.title', {
            username: author.username,
          })}
        </Text>
        {showMockedFields ? (
          <>
            <Icon
              name={IconName.VerifiedFilled}
              size={IconSize.Sm}
              twClassName="text-info-default shrink-0"
            />
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextMuted}
              twClassName="shrink-0"
            >
              {MOCK_MARKER}
            </Text>
          </>
        ) : null}
        {cohortEmoji ? (
          <Text variant={TextVariant.BodySm} twClassName="shrink-0">
            {cohortEmoji}
          </Text>
        ) : null}
      </Box>

      {isOwnPost ? null : (
        <Button
          variant={
            isFollowing ? ButtonVariant.Secondary : ButtonVariant.Primary
          }
          size={ButtonSize.Md}
          onPress={handleFollowPress}
          style={tw.style('shrink-0')}
          testID={PositionDetailsSheetSelectorsIDs.FOLLOW_BUTTON}
        >
          {strings(
            isFollowing
              ? 'social_leaderboard.position_sheet.following'
              : 'social_leaderboard.position_sheet.follow',
          )}
        </Button>
      )}
    </Box>
  );
};

export default PositionSheetHeader;
