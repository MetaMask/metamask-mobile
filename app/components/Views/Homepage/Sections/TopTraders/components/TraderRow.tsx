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

export interface TraderRowProps {
  trader: TopTrader;
  onFollowPress: (traderId: string) => void;
  testID?: string;
}

/**
 * TraderRow — a single row in the Top Traders leaderboard.
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

  const formattedPercentage = `+${trader.percentageChange}%`;
  const statsText = `${formattedPercentage} · ${trader.profitAmount} `;

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
        <AvatarBase
          size={AvatarBaseSize.Lg}
          fallbackText={trader.username.charAt(0).toUpperCase()}
        >
          {trader.avatarUri ? (
            <Image
              source={{ uri: trader.avatarUri }}
              style={tw.style('w-full h-full rounded-full')}
              resizeMode="cover"
            />
          ) : null}
        </AvatarBase>

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
          <Text variant={TextVariant.BodyXs} fontWeight={FontWeight.Medium}>
            <Text
              variant={TextVariant.BodyXs}
              fontWeight={FontWeight.Medium}
              twClassName="text-success-default"
            >
              {statsText}
            </Text>
            <Text
              variant={TextVariant.BodyXs}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextMuted}
            >
              {trader.period}
            </Text>
          </Text>
        </Box>
      </Box>

      {/* Follow / Following button.
           Follow   = Secondary (muted/outlined) — not yet following.
           Following = Primary (filled, branded) — active following state. */}
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
