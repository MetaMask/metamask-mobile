import {
  AvatarBase,
  AvatarBaseShape,
  AvatarBaseSize,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  ButtonIcon,
  ButtonIconSize,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  FontWeight,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { useCallback } from 'react';
import { Image, Pressable } from 'react-native';
import type { FeedTrader } from './mocks/types';

interface FeedCardHeaderProps {
  trader: FeedTrader;
  timeAgo: string;
}

/** Copy of the tier -> visible label mapping design uses on the leaderboard. */
const TIER_LABEL: Record<FeedTrader['tier'], string> = {
  shrimp: 'Shrimp',
  dolphin: 'Dolphin',
  whale: 'Whale',
};

// Emoji stand-ins for the tier icons Design used (fish variants). Kept as text
// so we don't need to ship extra image assets for a prototype.
const TIER_EMOJI: Record<FeedTrader['tier'], string> = {
  shrimp: '🦐',
  dolphin: '🐬',
  whale: '🐋',
};

/**
 * Header row shared by every feed entry — avatar + follow badge overlay,
 * trader name, WR pill, tier pill, time-ago, and the trailing `…` menu.
 * All interactive elements are `Pressable` no-ops in this prototype PR.
 */
const FeedCardHeader: React.FC<FeedCardHeaderProps> = ({ trader, timeAgo }) => {
  const tw = useTailwind();

  const noop = useCallback(() => undefined, []);

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      style={tw.style('gap-2')}
    >
      {/* Avatar with a follow-plus badge overlay (bottom-left, matches Design) */}
      <Pressable onPress={noop} hitSlop={4}>
        <Box style={tw.style('relative')}>
          <AvatarBase size={AvatarBaseSize.Md} shape={AvatarBaseShape.Circle}>
            <Image source={trader.avatar} style={tw.style('w-full h-full')} />
          </AvatarBase>
          <Box
            alignItems={BoxAlignItems.Center}
            style={tw.style(
              'absolute -bottom-0.5 -left-0.5 w-4 h-4 rounded-full bg-icon-default border-2 border-background-default items-center justify-center',
            )}
          >
            <Icon
              name={IconName.Add}
              size={IconSize.Xs}
              color={IconColor.PrimaryInverse}
            />
          </Box>
        </Box>
      </Pressable>

      {/* Name + pills row */}
      <Box style={tw.style('flex-1 flex-row items-center flex-wrap gap-1.5')}>
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextDefault}
        >
          {trader.name}
        </Text>
        <Box
          alignItems={BoxAlignItems.Center}
          style={tw.style(
            'flex-row bg-warning-muted rounded-md px-1.5 py-0.5 gap-0.5',
          )}
        >
          <Icon
            name={IconName.Trophy}
            size={IconSize.Xs}
            color={IconColor.WarningDefault}
          />
          <Text
            variant={TextVariant.BodyXs}
            fontWeight={FontWeight.Medium}
            color={TextColor.WarningDefault}
          >
            {trader.winRatePct}% WR
          </Text>
        </Box>
        <Box
          alignItems={BoxAlignItems.Center}
          style={tw.style(
            'flex-row bg-background-muted rounded-md px-1.5 py-0.5 gap-1',
          )}
        >
          <Text style={tw.style('text-xs')}>{TIER_EMOJI[trader.tier]}</Text>
          <Text
            variant={TextVariant.BodyXs}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextAlternative}
          >
            {TIER_LABEL[trader.tier]}
          </Text>
        </Box>
        <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
          {'\u00b7 ' + timeAgo}
        </Text>
      </Box>

      <ButtonIcon
        iconName={IconName.MoreHorizontal}
        size={ButtonIconSize.Md}
        onPress={noop}
      />
    </Box>
  );
};

export default FeedCardHeader;
