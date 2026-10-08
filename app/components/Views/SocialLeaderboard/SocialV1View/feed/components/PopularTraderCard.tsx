import {
  Box,
  BoxAlignItems,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React from 'react';
import { Pressable } from 'react-native';
import { strings } from '../../../../../../../locales/i18n';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import type { TopTrader } from '../../../../Homepage/Sections/TopTraders/types';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import TraderAvatar from '../../../../Homepage/Sections/TopTraders/components/TraderAvatar';
import { formatFollowerCountLabel } from '../../../utils/formatters';
import {
  getPopularTraderCardAvatarTestId,
  getPopularTraderCardFollowTestId,
  getPopularTraderCardTestId,
} from './PopularTraderCard.testIds';

export interface PopularTraderCardProps {
  trader: TopTrader;
  onFollowPress: (traderId: string) => void;
  onTraderPress?: (
    traderId: string,
    traderName: string,
    overallRank: number,
  ) => void;
  testID?: string;
}

const AVATAR_SIZE = 48;
export const POPULAR_TRADER_CARD_WIDTH = 156;

/**
 * PopularTraderCard -- discovery tile for the Trending Popular traders rail.
 *
 * Vertical stack matching TSA-1145: avatar, name, abbreviated follower count,
 * Follow. The identity block is pressable independently of the follow button.
 */
const PopularTraderCard: React.FC<PopularTraderCardProps> = ({
  trader,
  onFollowPress,
  onTraderPress,
  testID,
}) => {
  const tw = useTailwind();
  const followerLabel = formatFollowerCountLabel(trader.followerCount);

  return (
    <Box
      twClassName={`w-[${POPULAR_TRADER_CARD_WIDTH}px] rounded-xl overflow-hidden bg-muted`}
      testID={testID ?? getPopularTraderCardTestId(trader.id)}
    >
      <Pressable
        onPress={
          onTraderPress
            ? () =>
                onTraderPress(trader.id, trader.username, trader.overallRank)
            : undefined
        }
        disabled={!onTraderPress}
        accessibilityRole={onTraderPress ? 'button' : undefined}
        style={({ pressed }) =>
          tw.style(
            'px-4 pt-4',
            pressed && onTraderPress ? 'bg-muted-pressed' : undefined,
          )
        }
      >
        <Box alignItems={BoxAlignItems.Center} twClassName="gap-3">
          <TraderAvatar
            imageUrl={trader.avatarUri}
            address={trader.address}
            size={AVATAR_SIZE}
            testID={getPopularTraderCardAvatarTestId(trader.id)}
          />
          <Box alignItems={BoxAlignItems.Center} twClassName="w-full">
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextDefault}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {trader.username}
            </Text>
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
              numberOfLines={1}
            >
              {followerLabel}
            </Text>
          </Box>
        </Box>
      </Pressable>
      <Box twClassName="px-4 pb-4 pt-3">
        <Button
          variant={
            trader.isFollowing ? ButtonVariant.Secondary : ButtonVariant.Primary
          }
          size={ButtonSize.Sm}
          isFullWidth
          onPress={() => onFollowPress(trader.id)}
          testID={getPopularTraderCardFollowTestId(trader.id)}
        >
          {trader.isFollowing
            ? strings('social_leaderboard.following')
            : strings('social_leaderboard.follow')}
        </Button>
      </Box>
    </Box>
  );
};

export default PopularTraderCard;
