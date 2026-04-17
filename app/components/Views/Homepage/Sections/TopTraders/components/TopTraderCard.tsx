import React from 'react';
import { Image, TouchableOpacity } from 'react-native';
import {
  Box,
  Text,
  TextVariant,
  FontWeight,
  TextColor,
  BoxAlignItems,
  AvatarBase,
  AvatarBaseSize,
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../../locales/i18n';
import type { TopTrader } from '../types';
import { formatPnl } from '../utils/formatPnl';

export interface TopTraderCardProps {
  trader: TopTrader;
  onFollowPress: (traderId: string) => void;
  onTraderPress?: (traderId: string, traderName: string) => void;
  isFollowDisabled?: boolean;
  testID?: string;
}

const AVATAR_SIZE = 40;

/**
 * TopTraderCard -- compact card for the homepage horizontal scroll.
 *
 * Displays a trader's avatar, username, performance stats (ROI + PnL),
 * and a Follow/Following toggle.
 */
const TopTraderCard: React.FC<TopTraderCardProps> = ({
  trader,
  onFollowPress,
  onTraderPress,
  isFollowDisabled,
  testID,
}) => {
  const tw = useTailwind();

  const roiSign = trader.percentageChange >= 0 ? '+' : '';
  const roiText = `${roiSign}${trader.percentageChange.toFixed(1)}%`;
  const pnlText = formatPnl(trader.pnlValue);
  const isPnlPositive = trader.pnlValue >= 0;
  const isRoiPositive = trader.percentageChange >= 0;

  return (
    <Box
      twClassName="w-[200px] rounded-2xl bg-muted p-4 overflow-hidden"
      testID={testID ?? `top-trader-card-${trader.id}`}
    >
      {/* Top content: avatar + name + stats */}
      <TouchableOpacity
        activeOpacity={onTraderPress ? 0.7 : 1}
        onPress={
          onTraderPress
            ? () => onTraderPress(trader.id, trader.username)
            : undefined
        }
        disabled={!onTraderPress}
        testID={`top-trader-card-pressable-${trader.id}`}
      >
        <Box alignItems={BoxAlignItems.Center} twClassName="flex-1 gap-2 mb-3">
          {/* Avatar */}
          {trader.avatarUri ? (
            <Image
              source={{ uri: trader.avatarUri }}
              style={tw.style(
                `w-[${AVATAR_SIZE}px] h-[${AVATAR_SIZE}px] rounded-full bg-muted`,
              )}
              resizeMode="cover"
              testID={`top-trader-avatar-${trader.id}`}
            />
          ) : (
            <AvatarBase
              size={AvatarBaseSize.Lg}
              fallbackText={trader.username.charAt(0).toUpperCase()}
            />
          )}

          {/* Username */}
          <Text
            variant={TextVariant.HeadingSm}
            fontWeight={FontWeight.Bold}
            color={TextColor.TextDefault}
            numberOfLines={1}
          >
            {trader.username}
          </Text>

          {/* Stats: +96.2% · +$963K 30D */}
          <Text variant={TextVariant.BodyXs} fontWeight={FontWeight.Medium}>
            <Text
              variant={TextVariant.BodyXs}
              fontWeight={FontWeight.Medium}
              twClassName={
                isRoiPositive ? 'text-success-default' : 'text-error-default'
              }
            >
              {roiText}
            </Text>
            <Text
              variant={TextVariant.BodyXs}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextDefault}
            >
              {' \u00B7 '}
            </Text>
            <Text
              variant={TextVariant.BodyXs}
              fontWeight={FontWeight.Medium}
              twClassName={
                isPnlPositive ? 'text-success-default' : 'text-error-default'
              }
            >
              {pnlText}
            </Text>
            <Text
              variant={TextVariant.BodyXs}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextAlternative}
            >
              {' 30D'}
            </Text>
          </Text>
        </Box>
      </TouchableOpacity>

      {/* Follow / Following button pinned to bottom */}
      <Button
        variant={
          trader.isFollowing ? ButtonVariant.Primary : ButtonVariant.Secondary
        }
        size={ButtonSize.Sm}
        isDisabled={isFollowDisabled}
        twClassName="self-center"
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
