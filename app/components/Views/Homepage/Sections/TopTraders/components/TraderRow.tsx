import {
  AvatarAccount,
  AvatarAccountSize,
  AvatarAccountVariant,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
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
import { TopRankAvatar } from '../topRank';
import type { TopTrader } from '../types';
import { hasRealAvatar } from '../utils/avatarFallback';

const AVATAR_SIZE = 40;
// Fixed row height so the skeleton placeholder can match it exactly without
// drifting due to font-scale or button-size differences.
export const TRADER_ROW_HEIGHT = 64;

export interface TraderRowProps {
  trader: TopTrader;
  onFollowPress: (traderId: string) => void;
  onTraderPress?: (
    traderId: string,
    traderName: string,
    /* Used downstream for podium decoration */
    overallRank: number,
  ) => void;
  testID?: string;
}

/**
 * TraderRow -- a single row in the Top Traders leaderboard.
 *
 * Displays the trader's rank, avatar, username, performance stats,
 * and a Follow / Following toggle button.
 */
const TraderRow: React.FC<TraderRowProps> = ({
  trader,
  onFollowPress,
  onTraderPress,
  testID,
}) => {
  const tw = useTailwind();

  const isPnlPositive = trader.pnlValue >= 0;
  const pnlSign = isPnlPositive ? '+' : '-';
  const pnlAbs = Math.abs(trader.pnlValue);
  const pnlParts = pnlAbs.toFixed(2).split('.');
  pnlParts[0] = pnlParts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const pnlText = `${pnlSign}$${pnlParts.join('.')}`;

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
      twClassName="px-4"
      style={{ height: TRADER_ROW_HEIGHT }}
      testID={testID ?? `trader-row-${trader.id}`}
    >
      <TouchableOpacity
        activeOpacity={onTraderPress ? 0.7 : 1}
        onPress={
          onTraderPress
            ? () =>
                onTraderPress(trader.id, trader.username, trader.overallRank)
            : undefined
        }
        style={tw.style('flex-1 min-w-0 mr-3')}
        disabled={!onTraderPress}
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={3}
        >
          <TopRankAvatar>
            {hasRealAvatar(trader.avatarUri) ? (
              <Image
                source={{ uri: trader.avatarUri }}
                style={tw.style(
                  `w-[${AVATAR_SIZE}px] h-[${AVATAR_SIZE}px] rounded-full bg-muted`,
                )}
                resizeMode="cover"
              />
            ) : (
              <AvatarAccount
                variant={AvatarAccountVariant.Maskicon}
                address={trader.address}
                size={AvatarAccountSize.Lg}
                twClassName="rounded-full"
              />
            )}
          </TopRankAvatar>

          <Box twClassName="flex-1 min-w-0">
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextDefault}
              numberOfLines={1}
            >
              {trader.username}
            </Text>
            <Text
              variant={TextVariant.BodySm}
              fontWeight={FontWeight.Medium}
              twClassName={
                isPnlPositive ? 'text-success-default' : 'text-error-default'
              }
              numberOfLines={1}
            >
              {pnlText}
            </Text>
          </Box>
        </Box>
      </TouchableOpacity>

      {/* Follow / Following button */}
      <Button
        variant={
          trader.isFollowing ? ButtonVariant.Secondary : ButtonVariant.Primary
        }
        size={ButtonSize.Md}
        onPress={() => onFollowPress(trader.id)}
        twClassName="min-w-[96px] self-center"
      >
        {trader.isFollowing
          ? strings('social_leaderboard.following')
          : strings('social_leaderboard.follow')}
      </Button>
    </Box>
  );
};

export default React.memo(TraderRow);
