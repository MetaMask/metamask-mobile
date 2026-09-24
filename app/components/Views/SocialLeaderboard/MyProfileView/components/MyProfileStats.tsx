import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React from 'react';
import { Pressable } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import {
  EM_DASH,
  formatCount,
  formatPercent,
  formatSignedFullUsdNoDecimals,
} from '../../utils/formatters';
import { MyProfileViewSelectorsIDs } from '../MyProfileView.testIds';
import type { MySocialProfile } from '../hooks/useMyProfile';

interface MyProfileStatsProps {
  profile: MySocialProfile;
  onPress?: () => void;
}

const MyProfileStats: React.FC<MyProfileStatsProps> = ({
  profile,
  onPress,
}) => {
  const winRate =
    profile.winRatePercent != null
      ? formatPercent(profile.winRatePercent, {
          showSign: false,
          decimals: 0,
        })
      : EM_DASH;
  const isWinRatePositive = (profile.winRatePercent ?? 0) > 0;
  const hasPnl = profile.pnlUsd != null;
  const pnl = formatSignedFullUsdNoDecimals(profile.pnlUsd);
  const isPnlPositive = profile.pnlUsd != null && profile.pnlUsd >= 0;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={
        onPress
          ? strings(
              'social_leaderboard.trader_profile.stats_sheet_accessibility_label',
            )
          : undefined
      }
      testID={MyProfileViewSelectorsIDs.STATS}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="mt-4 rounded-xl border border-muted overflow-hidden"
      >
        <Box
          alignItems={BoxAlignItems.Center}
          twClassName="flex-1 py-3 px-1 border-r border-muted"
        >
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            twClassName={isWinRatePositive ? 'text-success-default' : undefined}
            color={isWinRatePositive ? undefined : TextColor.TextDefault}
            testID={MyProfileViewSelectorsIDs.STATS_WIN_RATE}
          >
            {winRate}
          </Text>
          <Text
            variant={TextVariant.BodyXs}
            color={TextColor.TextAlternative}
            numberOfLines={1}
          >
            {strings('social_leaderboard.my_profile.win_rate')}
          </Text>
        </Box>
        <Box
          alignItems={BoxAlignItems.Center}
          twClassName="flex-1 py-3 px-1 border-r border-muted"
        >
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={hasPnl ? undefined : TextColor.TextDefault}
            twClassName={
              hasPnl
                ? isPnlPositive
                  ? 'text-success-default'
                  : 'text-error-default'
                : undefined
            }
            testID={MyProfileViewSelectorsIDs.STATS_PNL}
          >
            {pnl}
          </Text>
          <Text
            variant={TextVariant.BodyXs}
            color={TextColor.TextAlternative}
            numberOfLines={1}
          >
            {strings('social_leaderboard.my_profile.pnl')}
          </Text>
        </Box>
        <Box
          alignItems={BoxAlignItems.Center}
          twClassName="flex-1 py-3 px-1 border-r border-muted"
        >
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            testID={MyProfileViewSelectorsIDs.STATS_HOLD_TIME}
          >
            {profile.holdTimeLabel ?? EM_DASH}
          </Text>
          <Text
            variant={TextVariant.BodyXs}
            color={TextColor.TextAlternative}
            numberOfLines={1}
          >
            {strings('social_leaderboard.my_profile.hold_time')}
          </Text>
        </Box>
        <Box alignItems={BoxAlignItems.Center} twClassName="flex-1 py-3 px-1">
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            testID={MyProfileViewSelectorsIDs.STATS_TIMES_COPIED}
          >
            {formatCount(profile.timesCopied)}
          </Text>
          <Text
            variant={TextVariant.BodyXs}
            color={TextColor.TextAlternative}
            numberOfLines={1}
          >
            {strings('social_leaderboard.my_profile.times_copied')}
          </Text>
        </Box>
      </Box>
    </Pressable>
  );
};

export default MyProfileStats;
