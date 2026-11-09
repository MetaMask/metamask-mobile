import {
  Box,
  BoxAlignItems,
  Button,
  ButtonSize,
  ButtonVariant,
  Card,
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

import TraderAvatar from '../../../../../UI/SocialFeed/components/TraderAvatar';
import { formatFollowerCountLabel } from '../../../../../UI/SocialFeed/utils/formatters';
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

const AVATAR_SIZE = 40;
/** Figma card frame is 176px wide, including the 1px border. */
export const POPULAR_TRADER_CARD_WIDTH = 176;

/**
 * Overrides `Card`'s filled defaults (`p-4 bg-section`) with the outlined
 * tile. The 16px `rounded-2xl` corner stays the design-system default.
 * Later utilities win in `tw.style`.
 */
export const POPULAR_TRADER_CARD_SURFACE = `w-[${POPULAR_TRADER_CARD_WIDTH}px] overflow-hidden border border-muted bg-transparent p-3`;

/**
 * PopularTraderCard -- discovery tile for the Trending Popular traders rail.
 *
 * Outlined stack from the North Star card: 40px avatar, name, medium
 * follower count, and a 40px muted Follow button. The identity block is
 * pressable independently of the follow button.
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
    <Card
      twClassName={`${POPULAR_TRADER_CARD_SURFACE} items-center gap-3`}
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
            'w-full',
            pressed && onTraderPress ? 'bg-muted-pressed' : undefined,
          )
        }
      >
        <Box alignItems={BoxAlignItems.Center} gap={3}>
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
              fontWeight={FontWeight.Medium}
              color={TextColor.TextAlternative}
              numberOfLines={1}
            >
              {followerLabel}
            </Text>
          </Box>
        </Box>
      </Pressable>
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Md}
        isFullWidth
        onPress={() => onFollowPress(trader.id)}
        testID={getPopularTraderCardFollowTestId(trader.id)}
      >
        {trader.isFollowing
          ? strings('social_leaderboard.following')
          : strings('social_leaderboard.follow')}
      </Button>
    </Card>
  );
};

export default PopularTraderCard;
