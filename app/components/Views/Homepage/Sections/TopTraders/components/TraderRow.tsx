import {
  AvatarBase,
  AvatarBaseSize,
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
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import React, { useCallback } from 'react';
import { Image, TouchableOpacity } from 'react-native';
import { strings } from '../../../../../../../locales/i18n';
import { TopRankAvatar, TopRankIndicator } from '../topRank';
import type { TopTrader } from '../types';
import { formatPnl } from '../utils/formatPnl';

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

  const roiSign = trader.percentageChange >= 0 ? '+' : '';
  const roiText = `${roiSign}${trader.percentageChange.toFixed(1)}%`;
  const pnlText = formatPnl(trader.pnlValue);
  const isPnlPositive = trader.pnlValue >= 0;
  const isRoiPositive = trader.percentageChange >= 0;

  const handleFollowPress = useCallback(() => {
    impactAsync(ImpactFeedbackStyle.Light);
    onFollowPress(trader.id);
  }, [onFollowPress, trader.id]);

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
          <TopRankIndicator
            rank={trader.rank}
            podiumRank={trader.overallRank}
          />

          <TopRankAvatar rank={trader.overallRank}>
            {trader.avatarUri ? (
              <Image
                source={{ uri: trader.avatarUri }}
                style={tw.style(
                  `w-[${AVATAR_SIZE}px] h-[${AVATAR_SIZE}px] rounded-full bg-muted`,
                )}
                resizeMode="cover"
              />
            ) : (
              <AvatarBase
                size={AvatarBaseSize.Lg}
                fallbackText={trader.username.charAt(0).toUpperCase()}
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
              numberOfLines={1}
            >
              <Text
                variant={TextVariant.BodySm}
                fontWeight={FontWeight.Medium}
                twClassName={
                  isRoiPositive ? 'text-success-default' : 'text-error-default'
                }
              >
                {roiText}
              </Text>
              <Text
                variant={TextVariant.BodySm}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextDefault}
              >
                {' \u00B7 '}
              </Text>
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
                {' 30D'}
              </Text>
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
        onPress={handleFollowPress}
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
