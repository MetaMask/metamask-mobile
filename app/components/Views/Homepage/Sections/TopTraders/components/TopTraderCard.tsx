import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
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
import { TouchableOpacity, View } from 'react-native';
import { strings } from '../../../../../../../locales/i18n';
import type { TopTrader } from '../types';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { formatSignedAbbreviatedUsd } from '../../../../SocialLeaderboard/utils/formatters';
import TraderAvatar from './TraderAvatar';

export interface TopTraderCardProps {
  trader: TopTrader;
  onFollowPress: (traderId: string) => void;
  /**
   * Invoked when the card is tapped. The third argument is the trader's
   * **overall** (unfiltered) rank — used downstream to gate the profile's
   * podium decoration on true top-3 traders, never the filtered display
   * rank.
   */
  onTraderPress?: (
    traderId: string,
    traderName: string,
    overallRank: number,
  ) => void;
  testID?: string;
}

// Fixed dimensions for every tile in the homepage Top Traders carousel.
const AVATAR_SIZE = 40;
export const TOP_TRADER_CARD_WIDTH = 155;

// Matches the button placeholder height in TopTraderCardSkeleton.
const FOLLOW_BUTTON_HEIGHT = 32;

/**
 * TopTraderCard -- compact card for the homepage horizontal scroll.
 *
 * Lays out the trader's avatar with the username + 7D PnL stacked to its
 * right, and a small Follow / Following toggle pinned below. The card body
 * is fully pressable; the follow button is overlaid so it stays independent.
 */
const TopTraderCard: React.FC<TopTraderCardProps> = ({
  trader,
  onFollowPress,
  onTraderPress,
  testID,
}) => {
  const tw = useTailwind();
  const pnlText = formatSignedAbbreviatedUsd(trader.pnlValue);
  const isPnlPositive = trader.pnlValue >= 0;

  return (
    <Box
      twClassName={`relative w-[${TOP_TRADER_CARD_WIDTH}px] rounded-xl bg-muted overflow-hidden`}
      testID={testID ?? `top-trader-card-${trader.id}`}
    >
      <TouchableOpacity
        activeOpacity={onTraderPress ? 0.7 : 1}
        onPress={
          onTraderPress
            ? () =>
                onTraderPress(trader.id, trader.username, trader.overallRank)
            : undefined
        }
        disabled={!onTraderPress}
        testID={`top-trader-card-pressable-${trader.id}`}
      >
        <Box twClassName="gap-4 p-4">
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="gap-2"
          >
            <TraderAvatar
              imageUrl={trader.avatarUri}
              address={trader.address}
              size={AVATAR_SIZE}
              testID={`top-trader-avatar-${trader.id}`}
            />

            <Box twClassName="flex-1 min-w-0">
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
                numberOfLines={1}
                twClassName={
                  isPnlPositive ? 'text-success-default' : 'text-error-default'
                }
              >
                {pnlText}
              </Text>
            </Box>
          </Box>

          <Box style={{ height: FOLLOW_BUTTON_HEIGHT }} />
        </Box>
      </TouchableOpacity>

      <View
        pointerEvents="box-none"
        style={tw.style('absolute bottom-0 left-0 right-0 px-4 pb-4')}
      >
        <Button
          variant={
            trader.isFollowing ? ButtonVariant.Secondary : ButtonVariant.Primary
          }
          size={ButtonSize.Sm}
          isFullWidth
          onPress={() => onFollowPress(trader.id)}
        >
          {trader.isFollowing
            ? strings('social_leaderboard.following')
            : strings('social_leaderboard.follow')}
        </Button>
      </View>
    </Box>
  );
};

export default TopTraderCard;
