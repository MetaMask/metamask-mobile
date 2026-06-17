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
import React from 'react';
import { TouchableOpacity } from 'react-native';
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

// Fixed dimensions for every tile in the homepage Top Traders carousel
const AVATAR_SIZE = 60;
export const TOP_TRADER_CARD_WIDTH = 200;

/**
 * TopTraderCard -- compact card for the homepage horizontal scroll.
 *
 * Displays a trader's avatar (top-left), username, 7D PnL stats, and a
 * Follow/Following toggle pinned to the bottom.
 */
const TopTraderCard: React.FC<TopTraderCardProps> = ({
  trader,
  onFollowPress,
  onTraderPress,
  testID,
}) => {
  const pnlText = formatSignedAbbreviatedUsd(trader.pnlValue);
  const isPnlPositive = trader.pnlValue >= 0;

  return (
    <Box
      twClassName={`w-[${TOP_TRADER_CARD_WIDTH}px] h-auto rounded-2xl bg-muted p-4 overflow-hidden gap-1`}
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
        <Box alignItems={BoxAlignItems.Center} twClassName="gap-1">
          <TraderAvatar
            imageUrl={trader.avatarUri}
            address={trader.address}
            size={AVATAR_SIZE}
            testID={`top-trader-avatar-${trader.id}`}
          />

          <Box twClassName="w-full gap-0.5">
            <Text
              variant={TextVariant.HeadingSm}
              fontWeight={FontWeight.Bold}
              color={TextColor.TextDefault}
              numberOfLines={1}
              ellipsizeMode="tail"
              twClassName="text-center"
            >
              {trader.username}
            </Text>

            <Text
              variant={TextVariant.BodySm}
              fontWeight={FontWeight.Medium}
              twClassName="text-center"
            >
              <Text
                variant={TextVariant.BodySm}
                fontWeight={FontWeight.Medium}
                twClassName={
                  isPnlPositive ? 'text-success-default' : 'text-error-default'
                }
              >
                {pnlText}
              </Text>
              <Text
                variant={TextVariant.BodySm}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextAlternative}
              >
                {' 7D'}
              </Text>
            </Text>
          </Box>
        </Box>
      </TouchableOpacity>

      <Button
        variant={
          trader.isFollowing ? ButtonVariant.Secondary : ButtonVariant.Primary
        }
        size={ButtonSize.Md}
        twClassName="mt-2"
        isFullWidth
        onPress={() => onFollowPress(trader.id)}
      >
        {trader.isFollowing
          ? strings('social_leaderboard.following')
          : strings('social_leaderboard.follow')}
      </Button>
    </Box>
  );
};

export default TopTraderCard;
