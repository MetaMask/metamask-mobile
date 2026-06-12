import {
  AvatarAccount,
  AvatarAccountSize,
  AvatarAccountVariant,
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
import { Image, TouchableOpacity } from 'react-native';
import { strings } from '../../../../../../../locales/i18n';
import type { TopTrader } from '../types';
import { hasRealAvatar } from '../utils/avatarFallback';
import { formatFullPnl } from '../utils/formatPnl';

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
 * Displays a trader's avatar (top-left), username, 30D PnL stats, and a
 * Follow/Following toggle pinned to the bottom.
 */
const TopTraderCard: React.FC<TopTraderCardProps> = ({
  trader,
  onFollowPress,
  onTraderPress,
  testID,
}) => {
  const tw = useTailwind();

  const pnlText = formatFullPnl(trader.pnlValue);
  const pnlColorClass =
    trader.pnlValue == null
      ? undefined
      : trader.pnlValue >= 0
        ? 'text-success-default'
        : 'text-error-default';

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
          {hasRealAvatar(trader.avatarUri) ? (
            <Image
              source={{ uri: trader.avatarUri }}
              style={tw.style(
                `w-[${AVATAR_SIZE}px] h-[${AVATAR_SIZE}px] rounded-full bg-muted`,
              )}
              resizeMode="cover"
              testID={`top-trader-avatar-${trader.id}`}
            />
          ) : (
            <AvatarAccount
              variant={AvatarAccountVariant.Maskicon}
              address={trader.address}
              size={AvatarAccountSize.Xl}
              twClassName={`w-[${AVATAR_SIZE}px] h-[${AVATAR_SIZE}px] rounded-full`}
              maskiconProps={{ size: AVATAR_SIZE }}
            />
          )}

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
                twClassName={pnlColorClass}
                color={pnlColorClass ? undefined : TextColor.TextAlternative}
              >
                {pnlText}
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
