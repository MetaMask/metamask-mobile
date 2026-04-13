import React from 'react';
import { Image } from 'react-native';
import {
  Box,
  Text,
  TextVariant,
  FontWeight,
  TextColor,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
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

const AVATAR_SIZE = 40;

export interface TraderRowProps {
  trader: TopTrader;
  onFollowPress: (traderId: string) => void;
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
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
      twClassName="px-4 py-3"
      testID={testID ?? `trader-row-${trader.id}`}
    >
      {/* Left slot: rank + avatar + text info */}
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={3}
        twClassName="flex-1 min-w-0 mr-3"
      >
        {/* Rank number */}
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextDefault}
          twClassName="w-6 text-right"
        >
          {`${trader.rank}.`}
        </Text>

        {/* Avatar */}
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

        {/* Username + stats */}
        <Box twClassName="flex-1 min-w-0">
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextDefault}
            numberOfLines={1}
          >
            {trader.username}
          </Text>
          <Text variant={TextVariant.BodySm} fontWeight={FontWeight.Medium}>
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
              color={TextColor.TextMuted}
            >
              {' 30D'}
            </Text>
          </Text>
        </Box>
      </Box>

      {/* Follow / Following button */}
      <Button
        variant={
          trader.isFollowing ? ButtonVariant.Primary : ButtonVariant.Secondary
        }
        size={ButtonSize.Sm}
        onPress={() => onFollowPress(trader.id)}
      >
        {trader.isFollowing
          ? strings('social_leaderboard.following')
          : strings('social_leaderboard.follow')}
      </Button>
    </Box>
  );
};

export default TraderRow;
