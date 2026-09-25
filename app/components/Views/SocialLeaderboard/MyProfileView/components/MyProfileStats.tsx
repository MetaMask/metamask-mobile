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
import { MyProfileViewSelectorsIDs } from '../MyProfileView.testIds';
import type { OverlayedMyProfileStats } from '../utils/overlayMyProfileLiveStats';

interface MyProfileStatsProps {
  stats: OverlayedMyProfileStats;
  onPress?: () => void;
}

const MyProfileStats: React.FC<MyProfileStatsProps> = ({ stats, onPress }) => (
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
          twClassName={
            stats.isWinRatePositive ? 'text-success-default' : undefined
          }
          color={stats.isWinRatePositive ? undefined : TextColor.TextDefault}
          testID={MyProfileViewSelectorsIDs.STATS_WIN_RATE}
        >
          {stats.winRateLabel}
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
          color={stats.hasPnl ? undefined : TextColor.TextDefault}
          twClassName={
            stats.hasPnl
              ? stats.isPnlPositive
                ? 'text-success-default'
                : 'text-error-default'
              : undefined
          }
          testID={MyProfileViewSelectorsIDs.STATS_PNL}
        >
          {stats.pnlLabel}
        </Text>
        <Text
          variant={TextVariant.BodyXs}
          color={TextColor.TextAlternative}
          numberOfLines={1}
        >
          {strings('social_leaderboard.my_profile.pnl')}
        </Text>
      </Box>
      <Box alignItems={BoxAlignItems.Center} twClassName="flex-1 py-3 px-1">
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          testID={MyProfileViewSelectorsIDs.STATS_TIMES_COPIED}
        >
          {stats.timesCopiedLabel}
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

export default MyProfileStats;
