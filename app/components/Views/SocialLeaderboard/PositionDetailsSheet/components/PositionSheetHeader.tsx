import React, { useCallback } from 'react';
import { Pressable } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Button,
  ButtonIcon,
  ButtonIconSize,
  ButtonIconVariant,
  ButtonSize,
  ButtonVariant,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import TraderAvatar from '../../../../UI/SocialFeed/components/TraderAvatar';
import type { SocialV1FeedAuthor } from '../../../../UI/SocialFeed/types';
import { useFollowToggle } from '../../../../hooks/useFollowToggle';
import { useFollowWithNotificationSetup } from '../../hooks/useFollowWithNotificationSetup';
import ShareButtonSpinner from '../../components/ShareButtonSpinner';
import { PositionDetailsSheetSelectorsIDs } from '../PositionDetailsSheet.testIds';

const AVATAR_SIZE = 24;

export interface PositionSheetHeaderProps {
  author: SocialV1FeedAuthor;
  /** The viewer's own post: no Follow button. */
  isOwnPost: boolean;
  /** Dismisses the sheet, then opens the trader profile page. */
  onPressTrader: () => void;
  /** Shares a link to the position. No share button when absent. */
  onShare?: () => void;
  /** Shows a spinner in place of the share button while the link is made. */
  isSharing?: boolean;
}

const PositionSheetHeader = ({
  author,
  isOwnPost,
  onPressTrader,
  onShare,
  isSharing = false,
}: PositionSheetHeaderProps) => {
  const tw = useTailwind();
  const { isFollowing, toggleFollow } = useFollowToggle(author.id);
  const { followWithSetup } = useFollowWithNotificationSetup({
    requireSocialTerms: true,
    requireSocialProfile: true,
  });

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
      twClassName="justify-between px-4 py-2 border-b border-muted"
      testID={PositionDetailsSheetSelectorsIDs.HEADER}
    >
      <Pressable
        onPress={onPressTrader}
        accessibilityRole="button"
        accessibilityLabel={author.username}
        testID={PositionDetailsSheetSelectorsIDs.IDENTITY}
        style={tw.style('flex-row items-center gap-2 min-w-0 flex-1 mr-2')}
      >
        <TraderAvatar
          imageUrl={author.avatarUri}
          address={author.address}
          profileId={author.id}
          size={AVATAR_SIZE}
          recyclingKey={author.id}
        />
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={1}
          twClassName="min-w-0 shrink"
        >
          <Text
            variant={TextVariant.HeadingSm}
            numberOfLines={1}
            twClassName="shrink"
            testID={PositionDetailsSheetSelectorsIDs.TITLE}
          >
            {author.username}
          </Text>
          <Icon
            name={IconName.ArrowRight}
            size={IconSize.Sm}
            color={IconColor.IconAlternative}
          />
        </Box>
      </Pressable>

      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={2}
        twClassName="shrink-0"
      >
        {onShare && isSharing ? (
          <Box twClassName="h-10 w-10 items-center justify-center">
            <ShareButtonSpinner
              testID={PositionDetailsSheetSelectorsIDs.SHARE_SPINNER}
            />
          </Box>
        ) : onShare ? (
          <ButtonIcon
            iconName={IconName.Share}
            variant={ButtonIconVariant.Filled}
            size={ButtonIconSize.Lg}
            iconProps={{ color: IconColor.IconDefault, size: IconSize.Md }}
            onPress={onShare}
            accessibilityLabel={strings('social.profile.share_position')}
            testID={PositionDetailsSheetSelectorsIDs.SHARE_BUTTON}
          />
        ) : null}
        {isOwnPost ? null : (
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Md}
            onPress={handleFollowPress}
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
    </Box>
  );
};

export default PositionSheetHeader;
